"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMainDoc = exports.readContentTypes = exports.getMetadata = exports.listCommands = exports.parseTemplate = void 0;
var zip_1 = require("./zip");
var xml_1 = require("./xml");
var preprocessTemplate_1 = __importDefault(require("./preprocessTemplate"));
var processTemplate_1 = require("./processTemplate");
var reportUtils_1 = require("./reportUtils");
var errors_1 = require("./errors");
var debug_1 = require("./debug");
var DEFAULT_CMD_DELIMITER = '+++';
var DEFAULT_LITERAL_XML_DELIMITER = '||';
var CONTENT_TYPES_PATH = '[Content_Types].xml';
var TEMPLATE_PATH = 'word';
var XML_FILE_REGEX = new RegExp("".concat(TEMPLATE_PATH, "\\/[^\\/]+\\.xml"));
function parseTemplate(template) {
    return __awaiter(this, void 0, void 0, function () {
        var zip, contentTypes, mainDocument, templateXml, tic, parseResult, jsTemplate, tac;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug_1.logger.debug('Unzipping...');
                    return [4 /*yield*/, (0, zip_1.zipLoad)(template)];
                case 1:
                    zip = _a.sent();
                    // Read the 'document.xml' file (the template) and parse it
                    debug_1.logger.debug('finding main template file (e.g. document.xml)');
                    return [4 /*yield*/, readContentTypes(zip)];
                case 2:
                    contentTypes = _a.sent();
                    mainDocument = getMainDoc(contentTypes);
                    debug_1.logger.debug('Reading template...');
                    return [4 /*yield*/, (0, zip_1.zipGetText)(zip, "".concat(TEMPLATE_PATH, "/").concat(mainDocument))];
                case 3:
                    templateXml = _a.sent();
                    if (templateXml == null)
                        throw new errors_1.TemplateParseError("".concat(mainDocument, " could not be found"));
                    debug_1.logger.debug("Template file length: ".concat(templateXml.length));
                    debug_1.logger.debug('Parsing XML...');
                    tic = new Date().getTime();
                    return [4 /*yield*/, (0, xml_1.parseXml)(templateXml)];
                case 4:
                    parseResult = _a.sent();
                    jsTemplate = parseResult;
                    tac = new Date().getTime();
                    debug_1.logger.debug("File parsed in ".concat(tac - tic, " ms"), {
                        attach: jsTemplate,
                        attachLevel: 'trace',
                    });
                    return [2 /*return*/, { jsTemplate: jsTemplate, mainDocument: mainDocument, zip: zip, contentTypes: contentTypes }];
            }
        });
    });
}
exports.parseTemplate = parseTemplate;
function prepSecondaryXMLs(zip, main_doc_path, options) {
    return __awaiter(this, void 0, void 0, function () {
        var secondary_xml_files, prepped_secondaries, _i, secondary_xml_files_1, f, raw, js0, js;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    secondary_xml_files = [];
                    zip.forEach(function (filePath) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            if (XML_FILE_REGEX.test(filePath) &&
                                filePath !== "".concat(TEMPLATE_PATH, "/").concat(main_doc_path) &&
                                filePath.indexOf("".concat(TEMPLATE_PATH, "/template")) !== 0) {
                                secondary_xml_files.push(filePath);
                            }
                            return [2 /*return*/];
                        });
                    }); });
                    prepped_secondaries = [];
                    _i = 0, secondary_xml_files_1 = secondary_xml_files;
                    _a.label = 1;
                case 1:
                    if (!(_i < secondary_xml_files_1.length)) return [3 /*break*/, 5];
                    f = secondary_xml_files_1[_i];
                    return [4 /*yield*/, (0, zip_1.zipGetText)(zip, f)];
                case 2:
                    raw = _a.sent();
                    if (raw == null)
                        throw new errors_1.TemplateParseError("".concat(f, " could not be read"));
                    return [4 /*yield*/, (0, xml_1.parseXml)(raw)];
                case 3:
                    js0 = _a.sent();
                    js = (0, preprocessTemplate_1.default)(js0, options.cmdDelimiter);
                    prepped_secondaries.push([js, f]);
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, prepped_secondaries];
            }
        });
    });
}
function createReport(options, _probe) {
    return __awaiter(this, void 0, void 0, function () {
        var template, data, queryVars, literalXmlDelimiter, createOptions, xmlOptions, _a, jsTemplate, mainDocument, zip, contentTypes, prepped_template, queryResult, query, prepped_secondaries, highest_img_id, ctx, result, report1, images1, links1, htmls1, reportXml, numImages, numHtmls, _i, prepped_secondaries_1, _b, js, filePath, result_1, report2, images2, links2, htmls2, xml, segments, documentComponent, ensureContentType, finalContentTypesXml, output;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    debug_1.logger.debug('Report options:', { attach: options });
                    template = options.template, data = options.data, queryVars = options.queryVars;
                    literalXmlDelimiter = options.literalXmlDelimiter || DEFAULT_LITERAL_XML_DELIMITER;
                    createOptions = {
                        cmdDelimiter: getCmdDelimiter(options.cmdDelimiter),
                        literalXmlDelimiter: literalXmlDelimiter,
                        processLineBreaks: options.processLineBreaks != null ? options.processLineBreaks : true,
                        noSandbox: options.noSandbox || false,
                        runJs: options.runJs,
                        additionalJsContext: options.additionalJsContext || {},
                        failFast: options.failFast == null ? true : options.failFast,
                        rejectNullish: options.rejectNullish == null ? false : options.rejectNullish,
                        errorHandler: typeof options.errorHandler === 'function' ? options.errorHandler : null,
                        fixSmartQuotes: options.fixSmartQuotes == null ? false : options.fixSmartQuotes,
                    };
                    xmlOptions = { literalXmlDelimiter: literalXmlDelimiter };
                    return [4 /*yield*/, parseTemplate(template)];
                case 1:
                    _a = _c.sent(), jsTemplate = _a.jsTemplate, mainDocument = _a.mainDocument, zip = _a.zip, contentTypes = _a.contentTypes;
                    debug_1.logger.debug('Preprocessing template...');
                    prepped_template = (0, preprocessTemplate_1.default)(jsTemplate, createOptions.cmdDelimiter);
                    queryResult = null;
                    if (!(typeof data === 'function')) return [3 /*break*/, 4];
                    debug_1.logger.debug('Looking for the query in the template...');
                    return [4 /*yield*/, (0, processTemplate_1.extractQuery)(prepped_template, createOptions)];
                case 2:
                    query = _c.sent();
                    debug_1.logger.debug("Query: ".concat(query || 'no query found'));
                    return [4 /*yield*/, data(query, queryVars)];
                case 3:
                    queryResult = _c.sent();
                    return [3 /*break*/, 5];
                case 4:
                    queryResult = data;
                    _c.label = 5;
                case 5: return [4 /*yield*/, prepSecondaryXMLs(zip, mainDocument, createOptions)];
                case 6:
                    prepped_secondaries = _c.sent();
                    highest_img_id = Math.max.apply(Math, __spreadArray(__spreadArray([], prepped_secondaries.map(function (_a) {
                        var s = _a[0], _ = _a[1];
                        return (0, processTemplate_1.findHighestImgId)(s);
                    }), false), [(0, processTemplate_1.findHighestImgId)(prepped_template)], false));
                    // Process document.xml:
                    // - Generate the report
                    // - Build output XML and write it to disk
                    // - Images
                    debug_1.logger.debug('Generating report...');
                    ctx = (0, processTemplate_1.newContext)(createOptions, highest_img_id);
                    return [4 /*yield*/, (0, processTemplate_1.produceJsReport)(queryResult, prepped_template, ctx)];
                case 7:
                    result = _c.sent();
                    if (result.status === 'errors') {
                        throw result.errors;
                    }
                    report1 = result.report, images1 = result.images, links1 = result.links, htmls1 = result.htmls;
                    if (_probe === 'JS')
                        return [2 /*return*/, report1];
                    debug_1.logger.debug('Converting report to XML...');
                    reportXml = (0, xml_1.buildXml)(report1, xmlOptions);
                    if (_probe === 'XML')
                        return [2 /*return*/, reportXml];
                    debug_1.logger.debug('Writing report...');
                    (0, zip_1.zipSetText)(zip, "".concat(TEMPLATE_PATH, "/").concat(mainDocument), reportXml);
                    numImages = Object.keys(images1).length;
                    numHtmls = Object.keys(htmls1).length;
                    return [4 /*yield*/, processImages(images1, mainDocument, zip)];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, processLinks(links1, mainDocument, zip)];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, processHtmls(htmls1, mainDocument, zip)];
                case 10:
                    _c.sent();
                    _i = 0, prepped_secondaries_1 = prepped_secondaries;
                    _c.label = 11;
                case 11:
                    if (!(_i < prepped_secondaries_1.length)) return [3 /*break*/, 17];
                    _b = prepped_secondaries_1[_i], js = _b[0], filePath = _b[1];
                    // Grab the last used (highest) image id from the main document's context, but create
                    // a fresh one for each secondary XML.
                    ctx = (0, processTemplate_1.newContext)(createOptions, ctx.imageId);
                    return [4 /*yield*/, (0, processTemplate_1.produceJsReport)(queryResult, js, ctx)];
                case 12:
                    result_1 = _c.sent();
                    if (result_1.status === 'errors') {
                        throw result_1.errors;
                    }
                    report2 = result_1.report, images2 = result_1.images, links2 = result_1.links, htmls2 = result_1.htmls;
                    xml = (0, xml_1.buildXml)(report2, xmlOptions);
                    (0, zip_1.zipSetText)(zip, filePath, xml);
                    numImages += Object.keys(images2).length;
                    numHtmls += Object.keys(htmls2).length;
                    segments = filePath.split('/');
                    documentComponent = segments[segments.length - 1];
                    return [4 /*yield*/, processImages(images2, documentComponent, zip)];
                case 13:
                    _c.sent();
                    return [4 /*yield*/, processLinks(links2, mainDocument, zip)];
                case 14:
                    _c.sent();
                    return [4 /*yield*/, processHtmls(htmls2, mainDocument, zip)];
                case 15:
                    _c.sent();
                    _c.label = 16;
                case 16:
                    _i++;
                    return [3 /*break*/, 11];
                case 17:
                    // Process [Content_Types].xml
                    if (numImages || numHtmls) {
                        debug_1.logger.debug('Completing [Content_Types].xml...');
                        ensureContentType = function (extension, contentType) {
                            var children = contentTypes._children;
                            if (children.filter(function (o) { return !o._fTextNode && o._attrs.Extension === extension; })
                                .length) {
                                return;
                            }
                            (0, reportUtils_1.addChild)(contentTypes, (0, reportUtils_1.newNonTextNode)('Default', {
                                Extension: extension,
                                ContentType: contentType,
                            }));
                        };
                        if (numImages) {
                            debug_1.logger.debug('Completing [Content_Types].xml for IMAGES...');
                            ensureContentType('png', 'image/png');
                            ensureContentType('jpg', 'image/jpeg');
                            ensureContentType('jpeg', 'image/jpeg');
                            ensureContentType('gif', 'image/gif');
                            ensureContentType('bmp', 'image/bmp');
                            ensureContentType('svg', 'image/svg+xml');
                        }
                        if (numHtmls) {
                            debug_1.logger.debug('Completing [Content_Types].xml for HTML...');
                            ensureContentType('html', 'text/html');
                        }
                        finalContentTypesXml = (0, xml_1.buildXml)(contentTypes, xmlOptions);
                        (0, zip_1.zipSetText)(zip, CONTENT_TYPES_PATH, finalContentTypesXml);
                    }
                    debug_1.logger.debug('Zipping...');
                    return [4 /*yield*/, (0, zip_1.zipSave)(zip)];
                case 18:
                    output = _c.sent();
                    return [2 /*return*/, output];
            }
        });
    });
}
/**
 * Lists all the commands in a docx template.
 *
 * example:
 * ```js
 * const template_buffer = fs.readFileSync('template.docx');
 * const commands = await listCommands(template_buffer, ['{', '}']);
 * // `commands` will contain something like:
 * [
 *    { raw: 'INS some_variable', code: 'some_variable', type: 'INS' },
 *    { raw: 'IMAGE svgImgFile()', code: 'svgImgFile()', type: 'IMAGE' },
 * ]
 * ```
 *
 * @param template the docx template as a Buffer-like object
 * @param delimiter the command delimiter (defaults to ['+++', '+++'])
 */
function listCommands(template, delimiter) {
    return __awaiter(this, void 0, void 0, function () {
        var opts, _a, jsTemplate, mainDocument, zip, secondaries, xmls, commands, _i, xmls_1, js, prepped, ctx;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    opts = {
                        cmdDelimiter: getCmdDelimiter(delimiter),
                        // Otherwise unused but mandatory options
                        literalXmlDelimiter: DEFAULT_LITERAL_XML_DELIMITER,
                        processLineBreaks: true,
                        noSandbox: false,
                        additionalJsContext: {},
                        failFast: false,
                        rejectNullish: false,
                        errorHandler: null,
                        fixSmartQuotes: false,
                    };
                    return [4 /*yield*/, parseTemplate(template)];
                case 1:
                    _a = _b.sent(), jsTemplate = _a.jsTemplate, mainDocument = _a.mainDocument, zip = _a.zip;
                    return [4 /*yield*/, prepSecondaryXMLs(zip, mainDocument, opts)];
                case 2:
                    secondaries = _b.sent();
                    xmls = __spreadArray([jsTemplate], secondaries.map(function (_a) {
                        var js = _a[0], path = _a[1];
                        return js;
                    }), true);
                    commands = [];
                    _i = 0, xmls_1 = xmls;
                    _b.label = 3;
                case 3:
                    if (!(_i < xmls_1.length)) return [3 /*break*/, 6];
                    js = xmls_1[_i];
                    prepped = (0, preprocessTemplate_1.default)(js, opts.cmdDelimiter);
                    ctx = (0, processTemplate_1.newContext)(opts);
                    return [4 /*yield*/, (0, processTemplate_1.walkTemplate)(undefined, prepped, ctx, function (data, node, ctx) { return __awaiter(_this, void 0, void 0, function () {
                            var raw, _a, cmdName, code, type;
                            return __generator(this, function (_b) {
                                raw = (0, processTemplate_1.getCommand)(ctx.cmd, ctx.shorthands, ctx.options.fixSmartQuotes);
                                ctx.cmd = ''; // flush the context
                                _a = (0, processTemplate_1.splitCommand)(raw), cmdName = _a.cmdName, code = _a.cmdRest;
                                type = cmdName;
                                if (type != null && type !== 'CMD_NODE') {
                                    commands.push({
                                        raw: raw,
                                        type: type,
                                        code: code,
                                    });
                                }
                                return [2 /*return*/, undefined];
                            });
                        }); })];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [2 /*return*/, commands];
            }
        });
    });
}
exports.listCommands = listCommands;
/**
 * Extract metadata from a document, such as the number of pages or words.
 * @param template the docx template as a Buffer-like object
 */
function getMetadata(template) {
    return __awaiter(this, void 0, void 0, function () {
        // TODO: extract custom.xml as well?
        function getText(t) {
            if (t._children.length === 0)
                return undefined;
            var n = t._children[0];
            if (n._fTextNode)
                return n._text;
            throw new Error("Not a text node");
        }
        function findNodeText(m, tag) {
            for (var _i = 0, _a = m._children; _i < _a.length; _i++) {
                var t = _a[_i];
                if (t._fTextNode)
                    continue;
                if (t._tag === tag)
                    return getText(t);
            }
            return;
        }
        var app_xml_path, core_xml_path, zip, appXml, coreXml, numberize;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    app_xml_path = "docProps/app.xml";
                    core_xml_path = "docProps/core.xml";
                    return [4 /*yield*/, (0, zip_1.zipLoad)(template)];
                case 1:
                    zip = _a.sent();
                    return [4 /*yield*/, parsePath(zip, app_xml_path)];
                case 2:
                    appXml = _a.sent();
                    return [4 /*yield*/, parsePath(zip, core_xml_path)];
                case 3:
                    coreXml = _a.sent();
                    numberize = function (a) {
                        var c = Number(a);
                        if (Number.isFinite(c))
                            return c;
                        return;
                    };
                    return [2 /*return*/, {
                            pages: numberize(findNodeText(appXml, 'Pages')),
                            words: numberize(findNodeText(appXml, 'Words')),
                            characters: numberize(findNodeText(appXml, 'Characters')),
                            lines: numberize(findNodeText(appXml, 'Lines')),
                            paragraphs: numberize(findNodeText(appXml, 'Paragraphs')),
                            company: findNodeText(appXml, 'Company'),
                            template: findNodeText(appXml, 'Template'),
                            // from CoreXML
                            title: findNodeText(coreXml, 'dc:title'),
                            subject: findNodeText(coreXml, 'dc:subject'),
                            creator: findNodeText(coreXml, 'dc:creator'),
                            description: findNodeText(coreXml, 'dc:description'),
                            lastModifiedBy: findNodeText(coreXml, 'cp:lastModifiedBy'),
                            revision: findNodeText(coreXml, 'cp:revision'),
                            lastPrinted: findNodeText(coreXml, 'cp:lastPrinted'),
                            created: findNodeText(coreXml, 'dcterms:created'),
                            modified: findNodeText(coreXml, 'dcterms:modified'),
                            category: findNodeText(coreXml, 'cp:category'),
                        }];
            }
        });
    });
}
exports.getMetadata = getMetadata;
function parsePath(zip, xml_path) {
    return __awaiter(this, void 0, void 0, function () {
        var xmlFile, node;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, zip_1.zipGetText)(zip, xml_path)];
                case 1:
                    xmlFile = _a.sent();
                    if (xmlFile == null)
                        throw new errors_1.TemplateParseError("".concat(xml_path, " could not be read"));
                    return [4 /*yield*/, (0, xml_1.parseXml)(xmlFile)];
                case 2:
                    node = _a.sent();
                    if (node._fTextNode)
                        throw new errors_1.TemplateParseError("".concat(xml_path, " is a text node when parsed"));
                    return [2 /*return*/, node];
            }
        });
    });
}
function readContentTypes(zip) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, parsePath(zip, CONTENT_TYPES_PATH)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.readContentTypes = readContentTypes;
function getMainDoc(contentTypes) {
    var MAIN_DOC_MIMES = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
        'application/vnd.ms-word.document.macroEnabled.main+xml',
    ];
    for (var _i = 0, _a = contentTypes._children; _i < _a.length; _i++) {
        var t = _a[_i];
        if (!t._fTextNode) {
            if (t._attrs.ContentType != null &&
                MAIN_DOC_MIMES.includes(t._attrs.ContentType)) {
                var path = t._attrs.PartName;
                if (path) {
                    return path.replace('/word/', '');
                }
            }
        }
    }
    throw new errors_1.TemplateParseError("Could not find main document (e.g. document.xml) in ".concat(CONTENT_TYPES_PATH));
}
exports.getMainDoc = getMainDoc;
var processImages = function (images, documentComponent, zip) { return __awaiter(void 0, void 0, void 0, function () {
    var imageIds, relsPath, rels, i, imageId, _a, extension, imgData, imgName, imgPath, finalRelsXml;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                debug_1.logger.debug("Processing images for ".concat(documentComponent, "..."));
                imageIds = Object.keys(images);
                if (!imageIds.length)
                    return [2 /*return*/];
                debug_1.logger.debug('Completing document.xml.rels...');
                relsPath = "".concat(TEMPLATE_PATH, "/_rels/").concat(documentComponent, ".rels");
                return [4 /*yield*/, getRelsFromZip(zip, relsPath)];
            case 1:
                rels = _b.sent();
                for (i = 0; i < imageIds.length; i++) {
                    imageId = imageIds[i];
                    _a = images[imageId], extension = _a.extension, imgData = _a.data;
                    imgName = "template_".concat(documentComponent, "_").concat(imageId).concat(extension);
                    debug_1.logger.debug("Writing image ".concat(imageId, " (").concat(imgName, ")..."));
                    imgPath = "".concat(TEMPLATE_PATH, "/media/").concat(imgName);
                    if (typeof imgData === 'string') {
                        (0, zip_1.zipSetBase64)(zip, imgPath, imgData);
                    }
                    else {
                        (0, zip_1.zipSetBinary)(zip, imgPath, imgData);
                    }
                    (0, reportUtils_1.addChild)(rels, (0, reportUtils_1.newNonTextNode)('Relationship', {
                        Id: imageId,
                        Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
                        Target: "media/".concat(imgName),
                    }));
                }
                finalRelsXml = (0, xml_1.buildXml)(rels, {
                    literalXmlDelimiter: DEFAULT_LITERAL_XML_DELIMITER,
                });
                (0, zip_1.zipSetText)(zip, relsPath, finalRelsXml);
                return [2 /*return*/];
        }
    });
}); };
var processLinks = function (links, documentComponent, zip) { return __awaiter(void 0, void 0, void 0, function () {
    var linkIds, relsPath, rels, _i, linkIds_1, linkId, url, finalRelsXml;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug_1.logger.debug("Processing links for ".concat(documentComponent, "..."));
                linkIds = Object.keys(links);
                if (!linkIds.length) return [3 /*break*/, 2];
                debug_1.logger.debug('Completing document.xml.rels...');
                relsPath = "".concat(TEMPLATE_PATH, "/_rels/").concat(documentComponent, ".rels");
                return [4 /*yield*/, getRelsFromZip(zip, relsPath)];
            case 1:
                rels = _a.sent();
                for (_i = 0, linkIds_1 = linkIds; _i < linkIds_1.length; _i++) {
                    linkId = linkIds_1[_i];
                    url = links[linkId].url;
                    (0, reportUtils_1.addChild)(rels, (0, reportUtils_1.newNonTextNode)('Relationship', {
                        Id: linkId,
                        Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
                        Target: url,
                        TargetMode: 'External',
                    }));
                }
                finalRelsXml = (0, xml_1.buildXml)(rels, {
                    literalXmlDelimiter: DEFAULT_LITERAL_XML_DELIMITER,
                });
                (0, zip_1.zipSetText)(zip, relsPath, finalRelsXml);
                _a.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); };
var processHtmls = function (htmls, documentComponent, zip) { return __awaiter(void 0, void 0, void 0, function () {
    var htmlIds, htmlFiles, relsPath, rels, _i, htmlIds_1, htmlId, htmlData, htmlName, htmlPath, finalRelsXml;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug_1.logger.debug("Processing htmls for ".concat(documentComponent, "..."));
                htmlIds = Object.keys(htmls);
                if (!htmlIds.length) return [3 /*break*/, 2];
                // Process rels
                debug_1.logger.debug("Completing document.xml.rels...");
                htmlFiles = [];
                relsPath = "".concat(TEMPLATE_PATH, "/_rels/").concat(documentComponent, ".rels");
                return [4 /*yield*/, getRelsFromZip(zip, relsPath)];
            case 1:
                rels = _a.sent();
                for (_i = 0, htmlIds_1 = htmlIds; _i < htmlIds_1.length; _i++) {
                    htmlId = htmlIds_1[_i];
                    htmlData = htmls[htmlId];
                    htmlName = "template_".concat(documentComponent.replace(/\./g, '_'), "_").concat(htmlId, ".html");
                    debug_1.logger.debug("Writing html ".concat(htmlId, " (").concat(htmlName, ")..."));
                    htmlPath = "".concat(TEMPLATE_PATH, "/").concat(htmlName);
                    htmlFiles.push("/".concat(htmlPath));
                    (0, zip_1.zipSetText)(zip, htmlPath, htmlData);
                    (0, reportUtils_1.addChild)(rels, (0, reportUtils_1.newNonTextNode)('Relationship', {
                        Id: htmlId,
                        Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk',
                        Target: "".concat(htmlName),
                    }));
                }
                finalRelsXml = (0, xml_1.buildXml)(rels, {
                    literalXmlDelimiter: DEFAULT_LITERAL_XML_DELIMITER,
                });
                (0, zip_1.zipSetText)(zip, relsPath, finalRelsXml);
                _a.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); };
var getRelsFromZip = function (zip, relsPath) { return __awaiter(void 0, void 0, void 0, function () {
    var relsXml;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, zip_1.zipGetText)(zip, relsPath)];
            case 1:
                relsXml = _a.sent();
                if (!relsXml) {
                    relsXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n        <Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n        </Relationships>";
                }
                return [2 /*return*/, (0, xml_1.parseXml)(relsXml)];
        }
    });
}); };
var getCmdDelimiter = function (delimiter) {
    if (!delimiter)
        return [DEFAULT_CMD_DELIMITER, DEFAULT_CMD_DELIMITER];
    if (typeof delimiter === 'string')
        return [delimiter, delimiter];
    return delimiter;
};
exports.default = createReport;
