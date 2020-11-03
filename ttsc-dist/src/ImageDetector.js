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
exports.ImageDetector = void 0;
const exec = __importStar(require("actions-exec-listener"));
const core = __importStar(require("@actions/core"));
class ImageDetector {
    async getExistingImages() {
        const existingSet = new Set([]);
        const ids = (await exec.exec(`docker image ls -q`, [], { silent: true, listeners: { stderr: console.warn } })).stdoutStr.split(`\n`).filter(id => id !== ``);
        const repotags = (await exec.exec(`docker`, `image ls --format {{.Repository}}:{{.Tag}} --filter dangling=false`.split(' '), { silent: true, listeners: { stderr: console.warn } })).stdoutStr.split(`\n`).filter(id => id !== ``);
        core.debug(JSON.stringify({ log: "getExistingImages", ids, repotags }));
        ([...ids, ...repotags]).forEach(image => existingSet.add(image));
        core.debug(JSON.stringify({ existingSet }));
        return Array.from(existingSet);
    }
    async getImagesShouldSave(alreadRegisteredImages) {
        const resultSet = new Set(await this.getExistingImages());
        alreadRegisteredImages.forEach(image => resultSet.delete(image));
        return Array.from(resultSet);
    }
    async checkIfImageHasAdded(restoredImages) {
        const existing = await this.getExistingImages();
        return JSON.stringify(restoredImages) === JSON.stringify(existing);
    }
}
exports.ImageDetector = ImageDetector;
