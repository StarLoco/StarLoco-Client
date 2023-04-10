"use strict";
/*!
 * Electron JSON Settings Store
 * Renderer process
 *
 * Licensed under MIT
 * Copyright (c) 2020 [Samuel Carreira]
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const events_1 = require("events");
class ElectronJSONSettingsStoreRenderer extends events_1.EventEmitter {
    /**
     * Electron JSON Settings Store (Renderer)
     * @param options options
     */
    constructor(options) {
        super();
        /**
         * Flag to check if init method has been initialized
         * if not the system can warn the user to initialize
         * the module
         */
        this._hasInitialized = false;
        if (!this._checkProcessType('renderer')) {
            throw new Error('This module can only be used on the renderer process. Use the `ElectronJSONSettingsStoreMain` on main process.');
        }
        const defaultOptions = {
            emitEventOnUpdated: false
        };
        this._options = { ...defaultOptions, ...options };
        this._cachedSettings = {};
        this._defaults = {};
    }
    /**
     * Validate key with schema
     * (this is a async function because I don't want to require
     * validation module again on renderer process)
     *
     * @param key key name
     * @param value value to check
     *
     * @example
     * const schema = {size: { type: 'number', positive: true, integer: true, default: 25, min: 10, max: 40 }}
     * await settings.validate('size', 12)
     *  -> {status: true, default: 25}
     * await settings.validate('size', 50)
     *  -> {status: false, default: 25, errors: ["The 'size' field must be less than or equal to 40."]}
     */
    async validate(key, value) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        if (typeof key !== 'string') {
            throw new TypeError(`Expected ’key’ to be of type ’string’, got ${typeof key}`);
        }
        if (typeof key === 'string' && key.length === 0) {
            throw new TypeError('Enter a valid key name');
        }
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_validate', key, value);
    }
    /**
     * Sets the given key to cached memory
     * WARNING: the file is not written. If you also want to write
     * defaults to the file, you need to call writeSync() or
     * write() method after
     *
     * @param key key name or object to set multiple values at once
     * @param value value to store
     *
     * @example
     * await settings.set('debug', true);
     * await settings.set({debug: true, x: 5, y: -9})
     */
    async set(key, value) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        if (typeof key !== 'string' && typeof key !== 'object') {
            throw new TypeError(`Expected ’key’ to be of type ’string’ or ’object’, got ${typeof key}`);
        }
        if (typeof key !== 'object' && value === undefined) {
            throw new TypeError('You need to define a object');
        }
        if (typeof key === 'string' && key.length === 0) {
            throw new TypeError('Enter a valid key name');
        }
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_set', key, value);
    }
    /**
     * Sets the given object to cached memory
     * WARNING: the file is not written. If you also want to write
     * defaults to the file, you need to call writeSync() or
     * write() method after
     *
     * @param data settings object
     *
     * @example
     * await settings.setAll({debug: true, x: 5, y: -9})
     */
    async setAll(data) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_setAll', data);
    }
    /**
     * Sets the given key to cached memory and write the changes
     * to JSON file (sync file write operation on the main process)
     *
     * @param key key name or object to set multiple values at once
     * @param value value to store
     *
     * @example
     * await settings.setAndWriteSync('debug', true);
     * await settings.setAndWriteSync({debug: true, x: 5, y: -9})
     */
    async setAndWriteSync(key, value) {
        const setOperation = await this.set(key, value);
        if (!setOperation.status) {
            return setOperation; // Return the error
        }
        const writeResult = await this.writeSync();
        if (writeResult !== true) {
            setOperation.errors = `Write operation failed! ${writeResult.toString()}`;
            setOperation.status = false;
        }
        return setOperation;
    }
    /**
     * Sets the given key to cached memory and write the changes
     * to JSON file (async file write operation on the main process)
     *
     * @param key key name or object to set multiple values at once
     * @param value value to store
     *
     * @example
     * await settings.setAndWrite('debug', true);
     * await settings.setAndWrite({debug: true, x: 5, y: -9})
     */
    async setAndWrite(key, value) {
        const setOperation = await this.set(key, value);
        if (!setOperation.status) {
            return setOperation; // Return the error
        }
        const writeResult = await this.write();
        if (writeResult !== true) {
            setOperation.errors = `Write operation failed! ${writeResult.toString()}`;
            setOperation.status = false;
        }
        return setOperation;
    }
    /**
     * Write cached settings to file (sync file write operation on the main process)
     */
    async writeSync() {
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_writeSync');
    }
    /**
     * Write cached settings to file (async file write operation on the main process)
     */
    async write() {
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_write');
    }
    /**
     * Unsets the given key from the cached settings
     * @param key key
     */
    async unset(key) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        if (key.length === 0 || typeof key !== 'string') {
            throw new TypeError('Enter a valid key name');
        }
        // If key wasn't found return false
        if (!Object.prototype.hasOwnProperty.call(this._cachedSettings, key)) {
            return false;
        }
        delete this._cachedSettings[key];
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_unset', key);
    }
    /**
     * Disable file watcher
     * @returns true if operation success, false if error or
     * watcher not active
     */
    async disableFileWatcher() {
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_disableFileWatcher');
    }
    /**
     * Get setting from cache
     *
     * Return undefined if key was not found on cache and schema
     * WARNING: the file was not read
     * @param key key
     */
    get(key) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        if (key.length === 0 || typeof key !== 'string') {
            throw new TypeError('Enter a valid key name');
        }
        if (!Object.prototype.hasOwnProperty.call(this._cachedSettings, key)) {
            if (Object.prototype.hasOwnProperty.call(this._defaults, key)) {
                return this._defaults[key]; // Return schema default value
            }
            return undefined; // Failsave
        }
        return this._cachedSettings[key];
    }
    /**
     * Get default
     *
     * Return undefined if key was not found on schema
     * @param key key
     */
    getDefault(key) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        if (key.length === 0 || typeof key !== 'string') {
            throw new TypeError('Enter a valid key name');
        }
        if (Object.prototype.hasOwnProperty.call(this._defaults, key)) {
            return this._defaults[key]; // Return schema default value
        }
        return undefined; // Failsave
    }
    /**
     * Checks if the given key is in the cached settings
     * @param key key
     */
    has(key) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        if (key.length === 0 || typeof key !== 'string') {
            throw new TypeError('Enter a valid key name');
        }
        // If key wasn't found return false
        return Object.prototype.hasOwnProperty.call(this._cachedSettings, key);
    }
    /**
     * Reset cached settings to default values defined in schema
     * WARNING: the file is not written. If you also want to write
     * defaults to the file, you need to call writeSync() or
     * write() method after
     */
    async reset() {
        this._cachedSettings = this._defaults;
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_reset');
    }
    /**
     * Reset cached settings to default values defined in schema
     * and write the changes to file (sync operation)
     */
    async resetAndWriteSync() {
        this._cachedSettings = this._defaults;
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_resetAndWriteSync');
    }
    /**
     * Reset cached settings to default values defined in schema
     * and write the changes to file (async operation)
     */
    async resetAndWrite() {
        this._cachedSettings = this._defaults;
        return electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_resetAndWrite');
    }
    /**
     * Get All Settings
     * Returns an object with the current settings
     */
    get getAll() {
        return this._cachedSettings;
    }
    /**
     * Get default settings defined on schema
     */
    get getDefaults() {
        return this._defaults;
    }
    /**
     * Startup routine (async)
     * Recommended method to not block the renderer process
     */
    async init() {
        this._cachedSettings = await electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_getAll');
        this._defaults = await electron_1.ipcRenderer.invoke('ElectronJSONSettingsStore_getDefaults');
        this._hasInitialized = true;
        if (typeof this._defaults !== 'object' ||
            typeof this._cachedSettings !== 'object') {
            throw new TypeError('Invalid settings received');
        }
        // Register this renderer instance to the main process
        electron_1.ipcRenderer.send('ElectronJSONSettingsStore_addListener');
        electron_1.ipcRenderer.on('ElectronJSONSettingsStore_updateSettings', (_event, settings) => {
            this._cachedSettings = settings;
            if (this._options.emitEventOnUpdated) {
                this.emit('updated', this._cachedSettings);
            }
        });
    }
    /**
     * Startup routine (sync)
     * WARNING: Sending a synchronous message will block the whole
     * renderer process until the reply is received, so use this method
     * only as a last resort. It's much better to use the asynchronous version
     */
    initSync() {
        // Send only one sync message to optimize the process
        const getData = electron_1.ipcRenderer.sendSync('ElectronJSONSettingsStore_getAllAndDefaultsSync');
        this._cachedSettings = getData.cachedSettings;
        this._defaults = getData.defaults;
        this._hasInitialized = true;
        if (typeof this._defaults !== 'object' ||
            typeof this._cachedSettings !== 'object') {
            throw new TypeError('Invalid settings received');
        }
        // Register this renderer instance to the main process
        electron_1.ipcRenderer.send('ElectronJSONSettingsStore_addListener');
        electron_1.ipcRenderer.on('ElectronJSONSettingsStore_updateSettings', (_event, settings) => {
            this._cachedSettings = settings;
            if (this._options.emitEventOnUpdated) {
                this.emit('updated', this._cachedSettings);
            }
        });
    }
    /**
     * Check Process Type
     * @param processType a string representing the current process's type, can be "browser"
     * (i.e. main process), "renderer", or "worker"
     */
    _checkProcessType(processType) {
        return process.type === processType;
    }
}
exports.default = ElectronJSONSettingsStoreRenderer;
