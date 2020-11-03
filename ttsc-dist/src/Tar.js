"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadManifests = exports.loadRawManifests = exports.assertManifests = void 0;
const typescript_is_1 = require("typescript-is");
const fs_1 = require("fs");
function assertManifests(x) {
    typescript_is_1.assertType(x, object => { var path = ["x"]; function _string(object) { ; if (typeof object !== "string")
        return { message: "validation failed at " + path.join(".") + ": expected a string", path: path.slice(), reason: { type: "string" } };
    else
        return null; } function _null(object) { ; if (object !== null)
        return { message: "validation failed at " + path.join(".") + ": expected null", path: path.slice(), reason: { type: "null" } };
    else
        return null; } function sa__string_ea_10(object) { ; if (!Array.isArray(object))
        return { message: "validation failed at " + path.join(".") + ": expected an array", path: path.slice(), reason: { type: "array" } }; for (let i = 0; i < object.length; i++) {
        path.push("[" + i + "]");
        var error = _string(object[i]);
        path.pop();
        if (error)
            return error;
    } return null; } function su__null_sa__string_ea_10_10_10_eu(object) { var conditions = [_null, sa__string_ea_10]; for (const condition of conditions) {
        var error = condition(object);
        if (!error)
            return null;
    } return { message: "validation failed at " + path.join(".") + ": there are no valid alternatives", path: path.slice(), reason: { type: "union" } }; } function _80(object) { ; if (typeof object !== "object" || object === null || Array.isArray(object))
        return { message: "validation failed at " + path.join(".") + ": expected an object", path: path.slice(), reason: { type: "object" } }; {
        if ("Config" in object) {
            path.push("Config");
            var error = _string(object["Config"]);
            path.pop();
            if (error)
                return error;
        }
        else
            return { message: "validation failed at " + path.join(".") + ": expected 'Config' in object", path: path.slice(), reason: { type: "missing-property", property: "Config" } };
    } {
        if ("RepoTags" in object) {
            path.push("RepoTags");
            var error = su__null_sa__string_ea_10_10_10_eu(object["RepoTags"]);
            path.pop();
            if (error)
                return error;
        }
        else
            return { message: "validation failed at " + path.join(".") + ": expected 'RepoTags' in object", path: path.slice(), reason: { type: "missing-property", property: "RepoTags" } };
    } {
        if ("Layers" in object) {
            path.push("Layers");
            var error = sa__string_ea_10(object["Layers"]);
            path.pop();
            if (error)
                return error;
        }
        else
            return { message: "validation failed at " + path.join(".") + ": expected 'Layers' in object", path: path.slice(), reason: { type: "missing-property", property: "Layers" } };
    } return null; } function sa__80_ea_80(object) { ; if (!Array.isArray(object))
        return { message: "validation failed at " + path.join(".") + ": expected an array", path: path.slice(), reason: { type: "array" } }; for (let i = 0; i < object.length; i++) {
        path.push("[" + i + "]");
        var error = _80(object[i]);
        path.pop();
        if (error)
            return error;
    } return null; } var error = sa__80_ea_80(object); return error; });
}
exports.assertManifests = assertManifests;
async function loadRawManifests(path) {
    return (await fs_1.promises.readFile(`${path}/manifest.json`)).toString();
}
exports.loadRawManifests = loadRawManifests;
async function loadManifests(path) {
    const raw = await loadRawManifests(path);
    const manifests = JSON.parse(raw.toString());
    assertManifests(manifests);
    return manifests;
}
exports.loadManifests = loadManifests;
