'use strict';

const documents = require('../documents');
const Result = require('../results').Result;

function createCommentsReader(bodyReader) {
  function readCommentsXml(element) {
    return Result.combine(element.getElementsByTagName('w:comment')
      .map(readCommentElement));
  }

  function readCommentElement(element) {
    const id = element.attributes['w:id'];

    function readOptionalAttribute(name) {
      return (element.attributes[name] || '').trim() || null;
    }

    return bodyReader.readXmlElements(element.children)
      .map(function(body) {
        return documents.comment({
          commentId: id,
          body,
          authorName: readOptionalAttribute('w:author'),
          authorInitials: readOptionalAttribute('w:initials'),
        });
      });
  }

  return readCommentsXml;
}

exports.createCommentsReader = createCommentsReader;
