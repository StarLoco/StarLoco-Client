'use strict';

const _ = require('underscore');

const docxReader = require('./docx/docx-reader');
const docxStyleMap = require('./docx/style-map');
const DocumentConverter = require('./document-to-html').DocumentConverter;
const readStyle = require('./style-reader').readStyle;
const readOptions = require('./options-reader').readOptions;
const unzip = require('./unzip');
const Result = require('./results').Result;

exports.convertToHtml = convertToHtml;
exports.convertToMarkdown = convertToMarkdown;
exports.convert = convert;
exports.extractRawText = extractRawText;
exports.images = require('./images');
exports.transforms = require('./transforms');
exports.underline = require('./underline');
exports.embedStyleMap = embedStyleMap;
exports.readEmbeddedStyleMap = readEmbeddedStyleMap;

function convertToHtml(input, options) {
  return convert(input, options);
}

function convertToMarkdown(input, options) {
  const markdownOptions = Object.create(options || {});
  markdownOptions.outputFormat = 'markdown';
  return convert(input, markdownOptions);
}

async function convert(input, options) {
  options = readOptions(options);

  const docxFile = await unzip.openZip(input);
  options.embeddedStyleMap = await docxStyleMap.readStyleMap(docxFile);

  let documentResult = await docxReader.read(docxFile, input);
  documentResult = documentResult.map(options.transformDocument);
  const html = await convertDocumentToHtml(documentResult, options);
  return html;
}

function readEmbeddedStyleMap(input) {
  return unzip.openZip(input)
    .then(docxStyleMap.readStyleMap);
}

async function convertDocumentToHtml(documentResult, options) {
  const styleMapResult = parseStyleMap(options.readStyleMap());
  const parsedOptions = _.extend({}, options, {
    styleMap: styleMapResult.value,
  });
  const documentConverter = new DocumentConverter(parsedOptions);

  return documentResult.flatMapThen(function(document) {
    return styleMapResult.flatMapThen(function() {
      return documentConverter.convertToHtml(document);
    });
  });
}

function parseStyleMap(styleMap) {
  return Result.combine((styleMap || []).map(readStyle))
    .map(function(styleMap) {
      return styleMap.filter(function(styleMapping) {
        return !!styleMapping;
      });
    });
}

function extractRawText(input) {
  return unzip.openZip(input)
    .then(docxReader.read)
    .then(function(documentResult) {
      return documentResult.map(convertElementToRawText);
    });
}

function convertElementToRawText(element) {
  if (element.type === 'text') {
    return element.value;
  }
  const tail = element.type === 'paragraph' ? '\n\n' : '';
  return (element.children || []).map(convertElementToRawText).join('') + tail;
}

function embedStyleMap(input, styleMap) {
  return unzip.openZip(input)
    .tap(function(docxFile) {
      return docxStyleMap.writeStyleMap(docxFile, styleMap);
    })
    .then(function(docxFile) {
      return {
        toBuffer: docxFile.toBuffer,
      };
    });
}

exports.styleMapping = function() {
  throw new Error('Use a raw string instead of mammoth.styleMapping e.g. "p[style-name=\'Title\'] => h1" instead of mammoth.styleMapping("p[style-name=\'Title\'] => h1")');
};
