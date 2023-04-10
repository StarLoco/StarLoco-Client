'use strict';

const _ = require('underscore');
const xmlbuilder = require('xmlbuilder');


exports.writeString = writeString;


function writeString(root, namespaces) {
  const uriToPrefix = _.invert(namespaces);

  const nodeWriters = {
    element: writeElement,
    text: writeTextNode,
  };

  function writeNode(builder, node) {
    return nodeWriters[node.type](builder, node);
  }

  function writeElement(builder, element) {
    const elementBuilder = builder.element(mapElementName(element.name), element.attributes);
    element.children.forEach(function(child) {
      writeNode(elementBuilder, child);
    });
  }

  function mapElementName(name) {
    const longFormMatch = /^\{(.*)\}(.*)$/.exec(name);
    if (longFormMatch) {
      const prefix = uriToPrefix[longFormMatch[1]];
      return prefix + (prefix === '' ? '' : ':') + longFormMatch[2];
    }
    return name;

  }

  function writeDocument(root) {
    const builder = xmlbuilder
      .create(mapElementName(root.name), {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: true,
      });

    _.forEach(namespaces, function(uri, prefix) {
      const key = 'xmlns' + (prefix === '' ? '' : ':' + prefix);
      builder.attribute(key, uri);
    });

    root.children.forEach(function(child) {
      writeNode(builder, child);
    });
    return builder.end();
  }

  return writeDocument(root);
}

function writeTextNode(builder, node) {
  builder.text(node.value);
}
