"use strict";
/*!
 * Electron JSON Settings Store
 * Main process
 *
 * Licensed under MIT
 * Copyright (c) 2020 [Samuel Carreira]
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs = require("fs");
const path = require("path");
const Validator = require("fastest-validator");
// Interface ElectronJSONSettingsStoreResult {
//   status: boolean;
//   default: any;
//   errors?: string | string[];
// }
class ElectronJSONSettingsStoreMain {
    /**
     * Electron JSON Settings Store (Main)
     *
     * @param schema fastValidator schema
     * @param options options
     */
    constructor(schema, options) {
        /**
         * Flag to check if file is current be written (for async mode)
         */
        this._isWritingFlag = false;
        /**
         * Flag to trigger write operation again
         * Case: two almost simultanious async write operations
         * if true the system will write the file again
         */
        this._writeAgainFlag = false;
        /**
         * Flag to check quiting state (needed to
         * write before quit function )
         */
        this._isQuitingFlag = false;
        /**
         * Flag to check if init method has been initialized
         * if not the system can warn the user to initialize
         * the module. Usefull to help users who use async
         * operation an want to access to a setting before the
         * file read is completed
         */
        this._hasInitialized = false;
        if (!this._checkProcessType('browser')) {
            throw new Error('This module can only be used on the main process. Use the `ElectronJSONSettingsStoreRenderer` on renderer processes.');
        }
        if (typeof options !== 'object' || options === null) {
            throw new TypeError('You must specify a configuration object');
        }
        this._checkValidSchemaObject(schema); // Invalid schema will throw an error
        this._schema = schema;
        const defaultOptions = {
            filePath: electron_1.app.getPath('userData'),
            fileExtension: 'json',
            fileName: 'config',
            prettyPrint: true,
            validateFile: true,
            validate: true,
            defaultOnFailValidation: true,
            watchFile: false,
            writeBeforeQuit: false
        };
        this.options = { ...defaultOptions, ...options };
        if (this.options.filePath === undefined) {
            throw new Error('Cannot get the default userData path');
        }
        // @ts-ignore
        const fileNameWithExtension = `${this.options.fileName}.${this.options.fileExtension}`;
        this.completeFilePath = path.resolve(this.options.filePath, fileNameWithExtension);
        // Const v = new validator.default();
        // @ts-ignore
        const v = new Validator();
        this._check = v.compile(schema);
        this._defaults = this._retreiveDefaults(schema);
        this._watcher = null;
        this._lastWriteHrtime = process.hrtime.bigint();
        this.cachedSettings = {};
        this._windowListeners = [null];
        if (this.options.writeBeforeQuit) {
            this._writeBeforeQuit();
        }
        this._handleIpc()
            .catch(error => {
            throw new Error(`Cannot handle IPC ${error.toString()}`);
        });
    }
    /**
     * Get complete settings file path
     * @example
     * settings.getCompleteFilePath
     * 	=> c:\app\config.json
     */
    get getCompleteFilePath() {
        return this.completeFilePath;
    }
    // Set getCompleteFilePath(filepath: string) {
    // 	this.completeFilePath = filepath;
    // }
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
            return this._schema[key].default; // Return schema default value
        }
        return undefined; // Failsave
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
        if (!Object.prototype.hasOwnProperty.call(this.cachedSettings, key)) {
            if (Object.prototype.hasOwnProperty.call(this._schema, key)) {
                return this._schema[key].default; // Return schema default value
            }
            return undefined; // Failsave
        }
        return this.cachedSettings[key];
    }
    /**
     * Validate key with schema
     *
     * @param key key name
     * @param value value to check
     *
     * @example
     * const schema = {size: { type: 'number', positive: true, integer: true, default: 25, min: 10, max: 40 }}
     * settings.validate('size', 12)
     *  -> {status: true, default: 25}
     * settings.validate('size', 50)
     *  -> {status: false, default: 25, errors: ["The 'size' field must be less than or equal to 40."]}
     */
    validate(key, value) {
        if (typeof key !== 'string') {
            throw new TypeError(`Expected ’key’ to be of type ’string’, got ${typeof key}`);
        }
        if (typeof key === 'string' && key.length === 0) {
            throw new TypeError('Enter a valid key name');
        }
        const object = {};
        Object.defineProperty(object, key, {
            value,
            writable: true,
            enumerable: true,
            configurable: true
        });
        const validationResults = this._fastValidateSettings(object);
        if (validationResults === true) {
            return {
                status: true,
                default: this.getDefault(key),
                errors: false
            };
        }
        // Show errors
        const errorsList = [];
        // @ts-ignore
        Object.entries(validationResults).forEach(([_key, value]) => {
            if (Object.prototype.hasOwnProperty.call(value, 'message')) {
                const errorMessage = value.message.toString();
                errorsList.push(errorMessage);
            }
        });
        return {
            status: false,
            default: this.getDefault(key),
            errors: errorsList
        };
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
     * settings.set('debug', true);
     * settings.set({debug: true, x: 5, y: -9})
     */
    set(key, value) {
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
        try {
            if (typeof key === 'string') {
                const setResult = this._set(key, value);
                // If (setResult !== true) {
                //   throw new Error(setResult.toString());
                // }
                return setResult;
            }
            const setResultArrayGroup = {
                status: true,
                default: undefined,
                errors: []
            };
            // @ts-ignore
            Object.entries(key).forEach(([_key, _value]) => {
                const setResultArray = this._set(_key, _value);
                if (!setResultArray.status) {
                    setResultArrayGroup.status = false;
                    // @ts-ignore - Property 'push' does not exist on type 'string | string[]'
                    setResultArrayGroup.errors.push(setResultArray.errors);
                }
            });
            return setResultArrayGroup;
        }
        catch (error) {
            return error;
        }
    }
    /**
     * Sets the given key to cached memory and write the changes
     * to JSON file (sync operation)
     *
     * @param key key name or object to set multiple values at once
     * @param value value to store
     *
     * @example
     * settings.setAndWriteSync('debug', true);
     * settings.setAndWriteSync({debug: true, x: 5, y: -9})
     */
    setAndWriteSync(key, value) {
        const setOperation = this.set(key, value);
        if (!setOperation.status) {
            return setOperation; // Return the error
        }
        const writeResult = this.writeSync();
        if (writeResult !== true) {
            setOperation.errors = `Write operation failed! ${writeResult.toString()}`;
            setOperation.status = false;
        }
        return setOperation;
    }
    /**
     * Sets the given key to cached memory and write the changes
     * to JSON file (async operation)
     *
     * @param key key name or object to set multiple values at once
     * @param value value to store
     *
     * @example
     * settings.setAndWrite('debug', true);
     * settings.setAndWrite({debug: true, x: 5, y: -9})
     */
    async setAndWrite(key, value) {
        const setOperation = this.set(key, value);
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
     * Get All Settings
     */
    get getAll() {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        return this.cachedSettings;
    }
    /**
     * Get default settings defined on schema
     */
    get getDefaults() {
        return this._defaults;
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
     * settings.setAll({debug: true, x: 5, y: -9})
     */
    setAll(data) {
        if (!this._hasInitialized) {
            throw new Error('Init the module first (method init). If you are using a async operation please wait until the init promise is resolved');
        }
        if (!this.options.validate) {
            this._setCachedSettings(data);
            return;
        }
        const validationResults = this._fastValidateSettings(data);
        if (validationResults === true) {
            this._setCachedSettings(data);
            return;
        }
        // Failed validation
        if (this.options.defaultOnFailValidation) {
            this._setCachedSettings(this._defaults);
        }
        else {
            // Show errors
            Object.entries(validationResults).forEach(([_key, value]) => {
                if (Object.prototype.hasOwnProperty.call(value, 'message')) {
                    const errorMessage = value.message.toString();
                    throw new Error(`Set All validation fail: ’${errorMessage}’`);
                }
            });
        }
    }
    /**
     * Unsets the given key from the cached settings
     * @param key key
     */
    unset(key) {
        if (key.length === 0 || typeof key !== 'string') {
            throw new TypeError('Enter a valid key name');
        }
        // If key wasn't found return false
        if (!Object.prototype.hasOwnProperty.call(this.cachedSettings, key)) {
            return false;
        }
        delete this.cachedSettings[key];
        return true;
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
        return Object.prototype.hasOwnProperty.call(this.cachedSettings, key);
    }
    /**
     * Reset cached settings to default values defined in schema
     * WARNING: the file is not written. If you also want to write
     * defaults to the file, you need to call writeSync() or
     * write() method after
     */
    reset() {
        this._setCachedSettings(this._defaults);
    }
    /**
       * Reset cached settings to default values defined in schema
       * and write the changes to file (sync operation)
       */
    resetAndWriteSync() {
        this.reset();
        return this.writeSync();
    }
    /**
     * Reset cached settings to default values defined in schema
     * and write the changes to file (async operation)
     */
    async resetAndWrite() {
        this.reset();
        return this.write();
    }
    /**
     * Write cached settings to file (sync operation)
     */
    writeSync() {
        try {
            this._writeJSONFileSync(this.cachedSettings);
            return true;
        }
        catch (error) {
            return error.toString();
        }
    }
    /**
     * Write cached settings to file (async operation)
     */
    async write() {
        try {
            await this._writeJSONFile(this.cachedSettings);
            return true;
        }
        catch (error) {
            return error.toString();
        }
    }
    /**
     * Disable file watcher
     * @returns true if operation success, false if error or
     * watcher not active
     */
    disableFileWatcher() {
        try {
            if (this._watcher !== null && this.options.watchFile) {
                this._watcher.close();
                this._watcher = null;
                this.options.watchFile = false;
                return true;
            }
            return false;
        }
        catch (error) {
            console.log(error);
            return false;
        }
    }
    /**
     * Startup routine (synchronous file operation)
     */
    initSync() {
        try {
            const ensureResult = this._ensureDirAndFileSync();
            if (!ensureResult) {
                this._writeDefaultsAtInitSync();
                return;
            }
            const jsonData = fs.readFileSync(this.completeFilePath, 'utf8');
            const parsedResult = this._parseJSON(jsonData);
            if (parsedResult instanceof Error) {
                this._writeDefaultsAtInitSync();
                return;
            }
            this._setCachedSettings(parsedResult);
            if (this.options.validateFile) {
                this._validateSettingsSync(this.cachedSettings);
            }
            if (this.options.watchFile) {
                this._watchFile();
            }
            this._hasInitialized = true;
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
    /**
     * Startup routine (asynchronous file operation)
     */
    async init() {
        try {
            const ensureResult = await this._ensureDirAndFile();
            if (!ensureResult) {
                await this._writeDefaultsAtInit();
                return;
            }
            const jsonData = await fs.promises.readFile(this.completeFilePath, 'utf8');
            const parsedResult = this._parseJSON(jsonData);
            if (parsedResult instanceof Error) {
                await this._writeDefaultsAtInit();
                return;
            }
            this._setCachedSettings(parsedResult);
            if (!this.options.validateFile) {
                if (this.options.watchFile) {
                    this._watchFile();
                }
                this._hasInitialized = true;
                return;
            }
            if (this.options.validateFile) {
                await this._validateSettings(this.cachedSettings);
            }
            if (this.options.watchFile) {
                this._watchFile();
            }
            this._hasInitialized = true;
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
    /**
     * Write defaults at init, usefull when something
     * goes wrong like the file doesn't exists or there
     * are a JSON error (async fs write operation)
     */
    async _writeDefaultsAtInit() {
        console.log('defaults will be written');
        this._setCachedSettings(this._defaults);
        await this._writeJSONFile(this.cachedSettings);
        if (this.options.watchFile) {
            this._watchFile();
        }
        this._hasInitialized = true;
    }
    /**
     * Write defaults at init, usefull when something
     * goes wrong like the file doesn't exists or there
     * are a JSON error (sync fs write operation)
     */
    _writeDefaultsAtInitSync() {
        console.log('defaults will be written');
        this._setCachedSettings(this._defaults);
        this._writeJSONFileSync(this.cachedSettings);
        if (this.options.watchFile) {
            this._watchFile();
        }
        this._hasInitialized = true;
    }
    /**
     * Ensure file has read and write permissions
     * If not, try to create the folder and change
     * the permissions (async fs operations)
     * Returns true if all ok
     */
    async _ensureDirAndFile() {
        try {
            await fs.promises.access(this.completeFilePath, fs.constants.F_OK | fs.constants.W_OK);
            return true;
        }
        catch (error) {
            // Not the most beautiful code :-(
            if (error.code === 'EPERM') {
                try {
                    await fs.promises.chmod(this.completeFilePath, 0o666);
                    return true;
                }
                catch (error) {
                    console.log(error);
                    throw new Error(`No read or write permissions ’${this.completeFilePath}’. Make sure the file isn’t locked and that you have the right writing permissions.`);
                }
            }
            else if (error.code === 'ENOENT') {
                try {
                    if (!this.options.filePath) {
                        throw new Error('Invalid filePath');
                    }
                    await fs.promises.mkdir(this.options.filePath, { recursive: true });
                    return false;
                }
                catch (error) {
                    console.log(error);
                    throw new Error(`Cannot create folder ’${this.options.filePath}’. Make sure that you have the right writing permissions.`);
                }
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Ensure file has read and write permissions
     * If not, try to create the folder and change
     * the permissions (sync fs operations)
     * Returns true if all ok
     */
    _ensureDirAndFileSync() {
        try {
            fs.accessSync(this.completeFilePath, fs.constants.F_OK | fs.constants.W_OK);
            return true;
        }
        catch (error) {
            // Not the most beautiful code :-(
            if (error.code === 'EPERM') {
                try {
                    fs.chmodSync(this.completeFilePath, 0o666);
                    return true;
                }
                catch (error) {
                    console.log(error);
                    throw new Error(`No read or write permissions ’${this.completeFilePath}’. Make sure the file isn’t locked and that you have the right writing permissions.`);
                }
            }
            else if (error.code === 'ENOENT') {
                try {
                    if (!this.options.filePath) {
                        throw new Error('Invalid filePath');
                    }
                    fs.mkdirSync(this.options.filePath, { recursive: true });
                    return false;
                }
                catch (error) {
                    console.log(error);
                    throw new Error(`Cannot create folder ’${this.options.filePath}’. Make sure that you have the right writing permissions.`);
                }
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Set to cached settings and send to other processes (renderer) via
     * IPC channel if settings are new (prevent polute IPC channel with unecessary
     * message if settings wasn't changed)
     * @param settings new settings object
     */
    _setCachedSettings(settings) {
        const changedSettings = deepEqual(settings, this.cachedSettings);
        if (!changedSettings) {
            this.cachedSettings = settings;
            this._sendIPCUpdateSettings();
        }
    }
    _setCachedSettingsKey(key, value) {
        const changedSettings = this.cachedSettings[key] === value;
        if (!changedSettings) {
            this.cachedSettings[key] = value;
            this._sendIPCUpdateSettings();
        }
    }
    _sendIPCUpdateSettings() {
        this._windowListeners.forEach(listener => {
            if (listener) {
                listener.send('ElectronJSONSettingsStore_updateSettings', this.cachedSettings);
            }
        });
    }
    /**
     * Set value to cached
     * @param key key name or object to set multiple values at once
     * @param value value to store
     * @returns true if operation is completed | error message if validation failed
     * and no default is applied
     */
    _set(key, value) {
        // If key wasn't found
        if (!Object.prototype.hasOwnProperty.call(this.cachedSettings, key)) {
            if (Object.prototype.hasOwnProperty.call(this._defaults, key)) {
                this._setCachedSettingsKey(key, this._defaults[key]);
                return {
                    status: true,
                    default: this.getDefault(key),
                    errors: false
                };
            }
            // Failsave
            return {
                status: false,
                default: undefined,
                errors: 'Key not found in cached settings'
            };
        }
        // No validation
        if (!this.options.validate) {
            this._setCachedSettingsKey(key, value);
            return {
                status: true,
                default: this.getDefault(key),
                errors: false
            };
        }
        const validationResults = this.validate(key, value);
        if (validationResults.status) {
            // Validation ok: true
            this._setCachedSettingsKey(key, value);
            return validationResults;
        }
        // Failed validation
        if (this.options.defaultOnFailValidation) {
            this._setCachedSettingsKey(key, this._defaults[key]); // Apply defaults
            return {
                status: true,
                default: this.getDefault(key),
                errors: 'Default setting was applied'
            };
        }
        return validationResults;
    }
    _validateSettingsSync(settings) {
        const validationResults = this._fastValidateSettings(settings);
        // Validation failed
        if (validationResults !== true) {
            if (this.options.defaultOnFailValidation) {
                // Apply defaults only to errors
                Object.entries(validationResults).forEach(([_key, value]) => {
                    const keyField = value.field.toString();
                    Object.defineProperty(this.cachedSettings, keyField, {
                        value: this._schema[keyField].default,
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                });
                this._writeJSONFileSync(this.cachedSettings);
            }
            else {
                // Show errors
                Object.entries(validationResults).forEach(([_key, value]) => {
                    if (Object.prototype.hasOwnProperty.call(value, 'message')) {
                        const errorMessage = value.message.toString();
                        throw new Error(`Initial settings validation fail: ’${errorMessage}’`);
                    }
                });
            }
        }
    }
    async _validateSettings(settings) {
        const validationResults = this._fastValidateSettings(settings);
        // Validation failed
        if (validationResults !== true) {
            if (this.options.defaultOnFailValidation) {
                // Apply defaults only to errors
                Object.entries(validationResults).forEach(([_key, value]) => {
                    const keyField = value.field.toString();
                    Object.defineProperty(this.cachedSettings, keyField, {
                        value: this._schema[keyField].default,
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                });
                await this._writeJSONFile(this.cachedSettings);
            }
            else {
                // Show errors
                Object.entries(validationResults).forEach(([_key, value]) => {
                    if (Object.prototype.hasOwnProperty.call(value, 'message')) {
                        const errorMessage = value.message.toString();
                        throw new Error(`Initial settings validation fail: ’${errorMessage}’`);
                    }
                });
            }
        }
    }
    /**
       * Get default settings based on schema definition
       * @returns {object} default settings
       */
    _retreiveDefaults(schema) {
        const defaults = {};
        Object.entries(schema).forEach(([key, value]) => {
            Object.defineProperty(defaults, key, {
                value: value.default,
                writable: true,
                enumerable: true,
                configurable: true
            });
        });
        return defaults;
    }
    _parseJSON(data) {
        try {
            return JSON.parse(data);
        }
        catch (error) {
            const errorMessage = error.toString();
            console.log(`Error parsing JSON: ${errorMessage}`);
            return error;
        }
    }
    /**
       * Write JSON file ( Operation)
       * @param data object to be stringified
       */
    async _writeJSONFile(data) {
        if (this._isWritingFlag) {
            // Console.log('write again flag');
            this._writeAgainFlag = true;
            return;
        }
        if (this._watcher !== null) {
            this._watcher.close();
            this._watcher = null;
        }
        this._isWritingFlag = true;
        const dataString = JSON.stringify(data, undefined, this.options.prettyPrint ? 4 : undefined);
        // Console.log('writing');
        await fs.promises.writeFile(this.completeFilePath, dataString);
        this._isWritingFlag = false;
        this._lastWriteHrtime = process.hrtime.bigint();
        if (this.options.watchFile && this._watcher === null) {
            this._watchFile();
        }
        if (this._writeAgainFlag) {
            this._writeAgainFlag = false;
            this._writeJSONFile(data);
        }
    }
    /**
     * Write JSON file (Sync Operation)
     * @param plainData object to be stringified
     */
    _writeJSONFileSync(data) {
        try {
            if (this._isWritingFlag) {
                this._writeAgainFlag = true;
                return;
            }
            if (this._watcher !== null) {
                this._watcher.close();
                this._watcher = null;
            }
            this._isWritingFlag = true;
            const dataString = JSON.stringify(data, undefined, this.options.prettyPrint ? 4 : undefined);
            // Console.log('writing...');
            fs.writeFileSync(this.completeFilePath, dataString);
            this._isWritingFlag = false;
            this._lastWriteHrtime = process.hrtime.bigint();
            if (this.options.watchFile && this._watcher === null) {
                this._watchFile();
            }
            if (this._writeAgainFlag) {
                this._writeAgainFlag = false;
                this._writeJSONFileSync(data);
            }
        }
        catch (error) {
            throw new Error(error);
        }
    }
    _fileChanged() {
        try {
            // Console.log('file changed');
            const jsonData = fs.readFileSync(this.completeFilePath, 'utf8');
            const parsedResult = this._parseJSON(jsonData);
            if (parsedResult instanceof Error) {
                return;
            }
            if (!this.options.validateFile) {
                this._setCachedSettings(parsedResult);
                return;
            }
            const validationResults = this._fastValidateSettings(parsedResult);
            // Validation failed
            if (validationResults === true) {
                this._setCachedSettings(parsedResult);
                return;
            }
            if (this.options.defaultOnFailValidation) {
                // Apply defaults only to errors
                Object.entries(validationResults).forEach(([_key, value]) => {
                    const keyField = value.field.toString();
                    Object.defineProperty(this.cachedSettings, keyField, {
                        value: this._schema[keyField].default,
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                });
                this._writeJSONFileSync(this.cachedSettings);
            }
            else {
                console.log('invalid settings ignore');
                return;
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    _watchFile() {
        let fsWait = false;
        this._watcher = fs.watch(this.completeFilePath, (eventType, filename) => {
            if (filename && eventType === 'change') {
                if (fsWait || this._isWritingFlag) {
                    return;
                }
                if (process.hrtime.bigint() - this._lastWriteHrtime < 1e10) {
                    return;
                }
                fsWait = setTimeout(() => {
                    fsWait = false;
                    this._fileChanged();
                }, 1000);
            }
        });
    }
    _fastValidateSettings(object) {
        return this._check(object);
    }
    /**
     * Validate Schema Object
     * Throws error on invalid options
     * @param schema object
     */
    _checkValidSchemaObject(schema) {
        if (typeof schema !== 'object') {
            throw new TypeError('The `schema` option must be an object.');
        }
        if (Object.entries(schema).length === 0 && schema.constructor === Object) {
            throw new TypeError('The `schema` option cannot be empty.');
        }
        // Check if key has default value
        Object.entries(schema).forEach(([key, value]) => {
            if (!Object.prototype.hasOwnProperty.call(value, 'default')) {
                throw new Error(`The key ’${key}’ does not have a default value`);
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
    /**
     * Write Settings Before Quit
     * (sync operation)
     */
    _writeBeforeQuit() {
        electron_1.app.on('before-quit', event => {
            if (!this._isQuitingFlag && !this._isWritingFlag) {
                try {
                    this._isQuitingFlag = true;
                    event.preventDefault();
                    this.writeSync();
                }
                catch (error) {
                    console.log(error);
                }
                finally {
                    electron_1.app.quit();
                }
            }
        });
    }
    async _handleIpc() {
        electron_1.ipcMain.on('ElectronJSONSettingsStore_addListener', event => {
            const listener = event.sender;
            if (!this._windowListeners.includes(listener)) {
                this._windowListeners.push(listener);
            }
        });
        electron_1.ipcMain.on('ElectronJSONSettingsStore_getAllAndDefaultsSync', event => {
            const sendData = { cachedSettings: this.cachedSettings, defaults: this._defaults };
            event.returnValue = sendData;
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_validate', (_event, key, value) => {
            return this.validate(key, value);
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_set', (_event, key, value) => {
            return this.set(key, value);
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_setAll', (_event, data) => {
            return this.setAll(data);
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_setAndWriteSync', async (_event, key, value) => {
            return this.setAndWriteSync(key, value);
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_setAndWrite', async (_event, key, value) => {
            return this.setAndWrite(key, value);
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_writeSync', async () => {
            return this.writeSync();
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_write', async () => {
            return this.write();
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_getAll', () => {
            return this.cachedSettings;
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_getDefaults', () => {
            return this._defaults;
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_unset', (_event, key) => {
            return this.unset(key);
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_disableFileWatcher', () => {
            return this.disableFileWatcher();
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_reset', () => {
            return this.reset();
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_resetAndWriteSync', async () => {
            return this.resetAndWriteSync();
        });
        electron_1.ipcMain.handle('ElectronJSONSettingsStore_resetAndWrite', async () => {
            return this.resetAndWrite();
        });
    }
}
exports.default = ElectronJSONSettingsStoreMain;
/**
 * Checks if Objects are equal
 * @author https://stackoverflow.com/a/201265
 * @param x object 1
 * @param y object 2
 * @returns true if equals
 */
function deepEqual(x, y) {
    const ok = Object.keys;
    const tx = typeof x;
    const ty = typeof y;
    // @ts-ignore
    return x && y && tx === 'object' && tx === ty ? ok(x).length === ok(y).length && ok(x).every(key => deepEqual(x[key], y[key])) : x === y;
}
