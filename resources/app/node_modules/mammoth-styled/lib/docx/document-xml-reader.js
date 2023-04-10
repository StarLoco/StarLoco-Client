'use strict';

exports.DocumentXmlReader = DocumentXmlReader;

const documents = require('../documents');
const Result = require('../results').Result;


function DocumentXmlReader(options) {
  const bodyReader = options.bodyReader;

  function convertXmlToDocument(element) {
    const body = element.first('w:body');

    const result = bodyReader.readXmlElements(body.children)
      .map(function(children) {
        return new documents.Document(children, {
          notes: options.notes,
          comments: options.comments,
        });
      });
    return new Result(result.value, result.messages);
  }

  return {
    convertXmlToDocument,
  };
}
