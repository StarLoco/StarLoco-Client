'use strict';

const htmlPaths = require('../styles/html-paths');


function nonFreshElement(tagName, attributes, children) {
  return elementWithTag(
    htmlPaths.element(tagName, attributes, { fresh: false }),
    children);
}

function freshElement(tagName, attributes, children) {
  const tag = htmlPaths.element(tagName, attributes, { fresh: true });
  return elementWithTag(tag, children);
}

function elementWithTag(tag, children) {
  return {
    type: 'element',
    tag,
    children: children || [],
  };
}

function text(value) {
  return {
    type: 'text',
    value,
  };
}

const forceWrite = {
  type: 'forceWrite',
};

exports.freshElement = freshElement;
exports.nonFreshElement = nonFreshElement;
exports.elementWithTag = elementWithTag;
exports.text = text;
exports.forceWrite = forceWrite;

const voidTagNames = {
  br: true,
  hr: true,
  img: true,
};

function isVoidElement(node) {
  return (node.children.length === 0) && voidTagNames[node.tag.tagName];
}

exports.isVoidElement = isVoidElement;
