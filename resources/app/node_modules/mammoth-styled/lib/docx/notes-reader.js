'use strict';

const documents = require('../documents');
const Result = require('../results').Result;

exports.createFootnotesReader = createReader.bind(this, 'footnote');
exports.createEndnotesReader = createReader.bind(this, 'endnote');

function createReader(noteType, bodyReader) {
  function readNotesXml(element) {
    return Result.combine(element.getElementsByTagName('w:' + noteType)
      .filter(isFootnoteElement)
      .map(readFootnoteElement));
  }

  function isFootnoteElement(element) {
    const type = element.attributes['w:type'];
    return type !== 'continuationSeparator' && type !== 'separator';
  }

  function readFootnoteElement(footnoteElement) {
    const id = footnoteElement.attributes['w:id'];
    return bodyReader.readXmlElements(footnoteElement.children)
      .map(function(body) {
        return documents.Note({ noteType, noteId: id, body });
      });
  }

  return readNotesXml;
}
