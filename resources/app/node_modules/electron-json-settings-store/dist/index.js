"use strict";
/*!
 * Electron JSON Settings Store
 *
 *
 * Licensed under MIT
 * Copyright (c) 2020 [Samuel Carreira]
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronJSONSettingsStoreRenderer = exports.ElectronJSONSettingsStoreMain = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(errors, defaultValue) {
        super(errors);
        Object.setPrototypeOf(this, new.target.prototype);
        this.defaultValue = defaultValue;
        this.errors = errors;
        Error.captureStackTrace(this);
    }
}
exports.ValidationError = ValidationError;
var main_1 = require("./main");
Object.defineProperty(exports, "ElectronJSONSettingsStoreMain", { enumerable: true, get: function () { return main_1.default; } });
var renderer_1 = require("./renderer");
Object.defineProperty(exports, "ElectronJSONSettingsStoreRenderer", { enumerable: true, get: function () { return renderer_1.default; } });
// module.exports = (process.type === 'browser' ? require('./main') : require('./renderer'));
/**
 * Checks if current process Node version is lower
 * @param version version major number (like 12)
 */
function checkNodeVersion(version) {
    const NODE_MAJOR_VERSION = process.versions.node.split('.')[0];
    return (Number(NODE_MAJOR_VERSION) >= version);
}
/**
 * Checks if current process Electron version is lower
 * @param version version major number (like 7)
 */
function checkElectronVersion(version) {
    const NODE_ELECTRON_VERSION = process.versions.electron.split('.')[0];
    return (Number(NODE_ELECTRON_VERSION) >= version);
}
(() => {
    const MINIMAL_NODE_VERSION = 12;
    const MINIMAL_ELECTRON_VERSION = 7;
    if (!checkNodeVersion(MINIMAL_NODE_VERSION)) {
        throw new Error(`This module Requires Node v.${MINIMAL_NODE_VERSION} or higher`);
    }
    if (!checkElectronVersion(MINIMAL_ELECTRON_VERSION)) {
        throw new Error(`This module Requires Electron v.${MINIMAL_ELECTRON_VERSION} or higher because ipcRenderer.invoke method`);
    }
})();
