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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const LayerCache_1 = require("./src/LayerCache");
const ImageDetector_1 = require("./src/ImageDetector");
const main = async () => {
    const primaryKey = core.getInput(`key`, { required: true });
    const restoreKeys = core.getInput(`restore-keys`, { required: false }).split(`\n`).filter(key => key !== ``);
    const imageDetector = new ImageDetector_1.ImageDetector();
    const alreadyExistingImages = await imageDetector.getExistingImages();
    const layerCache = new LayerCache_1.LayerCache([]);
    layerCache.concurrency = parseInt(core.getInput(`concurrency`, { required: true }), 10);
    const restoredKey = await layerCache.restore(primaryKey, restoreKeys);
    await layerCache.cleanUp();
    core.saveState(`restored-key`, JSON.stringify(restoredKey !== undefined ? restoredKey : ''));
    core.saveState(`already-existing-images`, JSON.stringify(alreadyExistingImages));
    core.saveState(`restored-images`, JSON.stringify(await imageDetector.getImagesShouldSave(alreadyExistingImages)));
};
main().catch(e => {
    console.error(e);
    core.setFailed(e);
});
