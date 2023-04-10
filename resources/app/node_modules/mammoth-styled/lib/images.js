'use strict';

const _ = require('underscore');

const promises = require('./promises');
const Html = require('./html');

exports.imgElement = imgElement;

function imgElement(func) {
  return function(element) {
    return promises.when(func(element)).then(function(result) {
      const attributes = _.clone(result);
      if (element.altText) {
        attributes.alt = element.altText;
      }
      return [ Html.freshElement('img', attributes) ];
    });
  };
}

// Undocumented, but retained for backwards-compatibility with 0.3.x
exports.inline = exports.imgElement;

exports.dataUri = imgElement(function(element) {
  return element.read('base64').then(function(imageBuffer) {
    return {
      src: 'data:' + element.contentType + ';base64,' + imageBuffer,
    };
  });
});
