"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerCache = void 0;
const path = __importStar(require("path"));
const exec = __importStar(require("actions-exec-listener"));
const crypto_1 = __importDefault(require("crypto"));
const core = __importStar(require("@actions/core"));
const cache = __importStar(require("@actions/cache"));
const fs_1 = require("fs");
const recursive_readdir_1 = __importDefault(require("recursive-readdir"));
const Tar_1 = require("./Tar");
const string_format_1 = __importDefault(require("string-format"));
const native_promise_pool_1 = __importDefault(require("native-promise-pool"));
class LayerCache {
    constructor(ids) {
        this.ids = [];
        this.unformattedSaveKey = '';
        this.restoredRootKey = '';
        this.imagesDir = path.resolve(`${__dirname}/../.action-docker-layer-caching-docker_images`);
        this.enabledParallel = true;
        this.concurrency = 4;
        this.ids = ids;
    }
    async exec(command, args, options) {
        const result = await exec.exec(command, args, options);
        return result;
    }
    async store(key) {
        this.unformattedSaveKey = key;
        await this.saveImageAsUnpacked();
        if (this.enabledParallel) {
            await this.separateAllLayerCaches();
        }
        if (await this.storeRoot() === undefined) {
            core.info(`cache key already exists, aborting.`);
            return false;
        }
        await Promise.all(this.enabledParallel ? await this.storeLayers() : []);
        return true;
    }
    async saveImageAsUnpacked() {
        await fs_1.promises.mkdir(this.getSavedImageTarDir(), { recursive: true });
        await this.exec(`sh -c`, [`docker save '${(await this.makeRepotagsDockerSaveArgReady(this.ids)).join(`' '`)}' | tar -x -f - -C .`], { cwd: this.getSavedImageTarDir() });
    }
    async makeRepotagsDockerSaveArgReady(repotags) {
        const getMiddleIdsWithRepotag = async (id) => {
            return [id, ...(await this.getAllImageIdsFrom(id))];
        };
        return (await Promise.all(repotags.map(getMiddleIdsWithRepotag))).flat();
    }
    async getAllImageIdsFrom(repotag) {
        const { stdoutStr: rawHistoryIds } = await this.exec(`docker history -q`, [repotag], { silent: true, listeners: { stderr: console.warn } });
        const historyIds = rawHistoryIds.split(`\n`).filter(id => id !== `<missing>` && id !== ``);
        return historyIds;
    }
    async getManifests() {
        return Tar_1.loadManifests(this.getUnpackedTarDir());
    }
    async storeRoot() {
        const rootKey = await this.generateRootSaveKey();
        const paths = [
            this.getUnpackedTarDir(),
        ];
        core.info(`Start storing root cache, key: ${rootKey}, dir: ${paths}`);
        const cacheId = await LayerCache.dismissError(cache.saveCache(paths, rootKey), LayerCache.ERROR_CACHE_ALREAD_EXISTS_STR, -1);
        core.info(`Stored root cache, key: ${rootKey}, id: ${cacheId}`);
        return cacheId !== -1 ? cacheId : undefined;
    }
    async separateAllLayerCaches() {
        await this.moveLayerTarsInDir(this.getUnpackedTarDir(), this.getLayerCachesDir());
    }
    async joinAllLayerCaches() {
        await this.moveLayerTarsInDir(this.getLayerCachesDir(), this.getUnpackedTarDir());
    }
    async moveLayerTarsInDir(fromDir, toDir) {
        const layerTars = (await recursive_readdir_1.default(fromDir))
            .filter(path => path.endsWith(`/layer.tar`))
            .map(path => path.replace(`${fromDir}/`, ``));
        const moveLayer = async (layer) => {
            const from = path.resolve(`${fromDir}/${layer}`);
            const to = path.resolve(`${toDir}/${layer}`);
            core.debug(`Moving layer tar from ${from} to ${to}`);
            await fs_1.promises.mkdir(`${path.dirname(to)}`, { recursive: true });
            await fs_1.promises.rename(from, to);
        };
        await Promise.all(layerTars.map(moveLayer));
    }
    async storeLayers() {
        const pool = new native_promise_pool_1.default(this.concurrency);
        const result = Promise.all((await this.getLayerIds()).map(layerId => {
            return pool.open(() => this.storeSingleLayerBy(layerId));
        }));
        return result;
    }
    static async dismissError(promise, dismissStr, defaultResult) {
        try {
            return await promise;
        }
        catch (e) {
            core.debug(`catch error: ${e.toString()}`);
            if (typeof e.message !== 'string' || !e.message.includes(dismissStr)) {
                core.error(`Unexpected error: ${e.toString()}`);
                throw e;
            }
            core.info(`${dismissStr}: ${e.toString()}`);
            core.debug(e);
            return defaultResult;
        }
    }
    async storeSingleLayerBy(layerId) {
        const path = this.genSingleLayerStorePath(layerId);
        const key = await this.generateSingleLayerSaveKey(layerId);
        core.info(`Start storing layer cache: ${JSON.stringify({ layerId, key })}`);
        const cacheId = await LayerCache.dismissError(cache.saveCache([path], key), LayerCache.ERROR_CACHE_ALREAD_EXISTS_STR, -1);
        core.info(`Stored layer cache: ${JSON.stringify({ key, cacheId })}`);
        core.debug(JSON.stringify({ log: `storeSingleLayerBy`, layerId, path, key, cacheId }));
        return cacheId;
    }
    // ---
    async restore(primaryKey, restoreKeys) {
        const restoredCacheKey = await this.restoreRoot(primaryKey, restoreKeys);
        if (restoredCacheKey === undefined) {
            core.info(`Root cache could not be found. aborting.`);
            return undefined;
        }
        if (this.enabledParallel) {
            const hasRestoredAllLayers = await this.restoreLayers();
            if (!hasRestoredAllLayers) {
                core.info(`Some layer cache could not be found. aborting.`);
                return undefined;
            }
            await this.joinAllLayerCaches();
        }
        await this.loadImageFromUnpacked();
        return restoredCacheKey;
    }
    async restoreRoot(primaryKey, restoreKeys) {
        core.debug(`Trying to restore root cache: ${JSON.stringify({ restoreKeys, dir: this.getUnpackedTarDir() })}`);
        const restoredRootKey = await cache.restoreCache([this.getUnpackedTarDir()], primaryKey, restoreKeys);
        core.debug(`restoredRootKey: ${restoredRootKey}`);
        if (restoredRootKey === undefined) {
            return undefined;
        }
        this.restoredRootKey = restoredRootKey;
        return restoredRootKey;
    }
    async restoreLayers() {
        const pool = new native_promise_pool_1.default(this.concurrency);
        const tasks = (await this.getLayerIds()).map(layerId => pool.open(() => this.restoreSingleLayerBy(layerId)));
        try {
            await Promise.all(tasks);
        }
        catch (e) {
            if (typeof e.message === `string` && e.message.includes(LayerCache.ERROR_LAYER_CACHE_NOT_FOUND_STR)) {
                core.info(e.message);
                // Avoid UnhandledPromiseRejectionWarning
                tasks.map(task => task.catch(core.info));
                return false;
            }
            throw e;
        }
        return true;
    }
    async restoreSingleLayerBy(id) {
        const path = this.genSingleLayerStorePath(id);
        const key = await this.recoverSingleLayerKey(id);
        const dir = path.replace(/[^/\\]+$/, ``);
        core.debug(JSON.stringify({ log: `restoreSingleLayerBy`, id, path, dir, key }));
        await fs_1.promises.mkdir(dir, { recursive: true });
        const result = await cache.restoreCache([path], key);
        if (result == null) {
            throw new Error(`${LayerCache.ERROR_LAYER_CACHE_NOT_FOUND_STR}: ${JSON.stringify({ id })}`);
        }
        return result;
    }
    async loadImageFromUnpacked() {
        await exec.exec(`sh -c`, [`tar -c --gzip -f - . | docker load`], { cwd: this.getUnpackedTarDir() });
    }
    async cleanUp() {
        await fs_1.promises.rmdir(this.getImagesDir(), { recursive: true });
    }
    // ---
    getImagesDir() {
        return this.imagesDir;
    }
    getUnpackedTarDir() {
        return path.resolve(`${this.getImagesDir()}/${this.getCurrentTarStoreDir()}`);
    }
    getLayerCachesDir() {
        return `${this.getUnpackedTarDir()}-layers`;
    }
    getSavedImageTarDir() {
        return path.resolve(`${this.getImagesDir()}/${this.getCurrentTarStoreDir()}`);
    }
    getCurrentTarStoreDir() {
        return 'image';
    }
    genSingleLayerStorePath(id) {
        return path.resolve(`${this.getLayerCachesDir()}/${id}/layer.tar`);
    }
    async generateRootHashFromManifest() {
        const manifest = await Tar_1.loadRawManifests(this.getUnpackedTarDir());
        return crypto_1.default.createHash(`sha256`).update(manifest, `utf8`).digest(`hex`);
    }
    async generateRootSaveKey() {
        const rootHash = await this.generateRootHashFromManifest();
        const formatted = await this.getFormattedSaveKey(rootHash);
        core.debug(JSON.stringify({ log: `generateRootSaveKey`, rootHash, formatted }));
        return `${formatted}-root`;
    }
    async generateSingleLayerSaveKey(id) {
        const formatted = await this.getFormattedSaveKey(id);
        core.debug(JSON.stringify({ log: `generateSingleLayerSaveKey`, formatted, id }));
        return `layer-${formatted}`;
    }
    async recoverSingleLayerKey(id) {
        const unformatted = await this.recoverUnformattedSaveKey();
        return string_format_1.default(`layer-${unformatted}`, { hash: id });
    }
    async getFormattedSaveKey(hash) {
        const result = string_format_1.default(this.unformattedSaveKey, { hash });
        core.debug(JSON.stringify({ log: `getFormattedSaveKey`, hash, result }));
        return result;
    }
    async recoverUnformattedSaveKey() {
        const hash = await this.generateRootHashFromManifest();
        core.debug(JSON.stringify({ log: `recoverUnformattedSaveKey`, hash }));
        return this.restoredRootKey.replace(hash, `{hash}`).replace(/-root$/, ``);
    }
    async getLayerTarFiles() {
        const getTarFilesFromManifest = (manifest) => manifest.Layers;
        const tarFilesThatMayDuplicate = (await this.getManifests()).flatMap(getTarFilesFromManifest);
        const tarFiles = [...new Set(tarFilesThatMayDuplicate)];
        return tarFiles;
    }
    async getLayerIds() {
        const getIdfromLayerRelativePath = (path) => path.replace('/layer.tar', '');
        const layerIds = (await this.getLayerTarFiles()).map(getIdfromLayerRelativePath);
        core.debug(JSON.stringify({ log: `getLayerIds`, layerIds }));
        return layerIds;
    }
}
exports.LayerCache = LayerCache;
LayerCache.ERROR_CACHE_ALREAD_EXISTS_STR = `Cache already exists`;
LayerCache.ERROR_LAYER_CACHE_NOT_FOUND_STR = `Layer cache not found`;
