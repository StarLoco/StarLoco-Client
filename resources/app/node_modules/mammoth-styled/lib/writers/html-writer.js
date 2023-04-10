'use strict';

const util = require('util');
const _ = require('underscore');

exports.writer = writer;

function writer(options) {
  options = options || {};
  if (options.prettyPrint) {
    return prettyWriter();
  }
  return simpleWriter();

}


const indentedElements = {
  div: true,
  p: true,
  ul: true,
  li: true,
};


function prettyWriter() {
  let indentationLevel = 0;
  const indentation = '  ';
  const stack = [];
  let start = true;
  let inText = false;

  const writer = simpleWriter();

  function open(tagName, attributes) {
    if (indentedElements[tagName]) {
      indent();
    }
    stack.push(tagName);
    writer.open(tagName, attributes);
    if (indentedElements[tagName]) {
      indentationLevel++;
    }
    start = false;
  }

  function close(tagName) {
    if (indentedElements[tagName]) {
      indentationLevel--;
      indent();
    }
    stack.pop();
    writer.close(tagName);
  }

  function text(value) {
    startText();
    const text = isInPre() ? value : value.replace('\n', '\n' + indentation);
    writer.text(text);
  }

  function selfClosing(tagName, attributes) {
    indent();
    writer.selfClosing(tagName, attributes);
  }

  function insideIndentedElement() {
    return stack.length === 0 || indentedElements[stack[stack.length - 1]];
  }

  function startText() {
    if (!inText) {
      indent();
      inText = true;
    }
  }

  function indent() {
    inText = false;
    if (!start && insideIndentedElement() && !isInPre()) {
      writer._append('\n');
      for (let i = 0; i < indentationLevel; i++) {
        writer._append(indentation);
      }
    }
  }

  function isInPre() {
    return _.some(stack, function(tagName) {
      return tagName === 'pre';
    });
  }

  return {
    asString: writer.asString,
    open,
    close,
    text,
    selfClosing,
  };
}


function simpleWriter() {
  const fragments = [];

  function open(tagName, attributes) {
    const attributeString = generateAttributeString(attributes);
    fragments.push(util.format('<%s%s>', tagName, attributeString));
  }

  function close(tagName) {
    fragments.push(util.format('</%s>', tagName));
  }

  function selfClosing(tagName, attributes) {
    const attributeString = generateAttributeString(attributes);
    fragments.push(util.format('<%s%s />', tagName, attributeString));
  }

  function generateAttributeString(attributes) {
    return _.map(attributes, function(value, key) {
      return util.format(' %s="%s"', key, escapeHtmlAttribute(value));
    }).join('');
  }

  function text(value) {
    fragments.push(escapeHtmlText(value));
  }

  function append(html) {
    fragments.push(html);
  }

  function asString() {
    return fragments.join('');
  }

  return {
    asString,
    open,
    close,
    text,
    selfClosing,
    _append: append,
  };
}

function escapeHtmlText(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
