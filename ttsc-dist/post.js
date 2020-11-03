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
const typescript_is_1 = require("typescript-is");
const main = async () => {
    if (JSON.parse(core.getInput('skip-save', { required: true }))) {
        core.info('Skipping save.');
        return;
    }
    const primaryKey = core.getInput('key', { required: true });
    const restoredKey = JSON.parse(core.getState(`restored-key`));
    const alreadyExistingImages = JSON.parse(core.getState(`already-existing-images`));
    const restoredImages = JSON.parse(core.getState(`restored-images`));
    typescript_is_1.assertType(restoredKey, object => { var path = ["restoredKey"]; function _string(object) { ; if (typeof object !== "string")
        return { message: "validation failed at " + path.join(".") + ": expected a string", path: path.slice(), reason: { type: "string" } };
    else
        return null; } var error = _string(object); return error; });
    typescript_is_1.assertType(alreadyExistingImages, object => { var path = ["alreadyExistingImages"]; function _string(object) { ; if (typeof object !== "string")
        return { message: "validation failed at " + path.join(".") + ": expected a string", path: path.slice(), reason: { type: "string" } };
    else
        return null; } function sa__string_ea_10(object) { ; if (!Array.isArray(object))
        return { message: "validation failed at " + path.join(".") + ": expected an array", path: path.slice(), reason: { type: "array" } }; for (let i = 0; i < object.length; i++) {
        path.push("[" + i + "]");
        var error = _string(object[i]);
        path.pop();
        if (error)
            return error;
    } return null; } var error = sa__string_ea_10(object); return error; });
    typescript_is_1.assertType(restoredImages, object => { var path = ["restoredImages"]; function _string(object) { ; if (typeof object !== "string")
        return { message: "validation failed at " + path.join(".") + ": expected a string", path: path.slice(), reason: { type: "string" } };
    else
        return null; } function sa__string_ea_10(object) { ; if (!Array.isArray(object))
        return { message: "validation failed at " + path.join(".") + ": expected an array", path: path.slice(), reason: { type: "array" } }; for (let i = 0; i < object.length; i++) {
        path.push("[" + i + "]");
        var error = _string(object[i]);
        path.pop();
        if (error)
            return error;
    } return null; } var error = sa__string_ea_10(object); return error; });
    const imageDetector = new ImageDetector_1.ImageDetector();
    if (await imageDetector.checkIfImageHasAdded(restoredImages)) {
        core.info(`Key ${restoredKey} already exists, not saving cache.`);
        return;
    }
    const imagesToSave = await imageDetector.getImagesShouldSave(alreadyExistingImages);
    if (imagesToSave.length < 1) {
        core.info(`There is no image to save.`);
        return;
    }
    const layerCache = new LayerCache_1.LayerCache(imagesToSave);
    layerCache.concurrency = parseInt(core.getInput(`concurrency`, { required: true }), 10);
    await layerCache.store(primaryKey);
    await layerCache.cleanUp();
};
main().catch(e => {
    console.error(e);
    core.setFailed(e);
});
