'use strict';

const _ = require('underscore');

const ast = require('./ast');

function simplify(nodes) {
  return collapse(removeEmpty(nodes));
}

function collapse(nodes) {
  const children = [];

  nodes.map(collapseNode).forEach(function(child) {
    appendChild(children, child);
  });
  return children;
}

const collapsers = {
  element: collapseElement,
  text: identity,
  forceWrite: identity,
};


function collapseNode(node) {
  return collapsers[node.type](node);
}

function collapseElement(node) {
  return ast.elementWithTag(node.tag, collapse(node.children));
}

function identity(value) {
  return value;
}

function appendChild(children, child) {
  const lastChild = children[children.length - 1];
  if (child.type === 'element' && !child.tag.fresh && lastChild && lastChild.type === 'element' && child.tag.matchesElement(lastChild.tag)) {
    if (child.tag.separator) {
      appendChild(lastChild.children, ast.text(child.tag.separator));
    }
    child.children.forEach(function(grandChild) {
      // Mutation is fine since simplifying elements create a copy of the children.
      appendChild(lastChild.children, grandChild);
    });
  } else {
    children.push(child);
  }
}

const emptiers = {
  element: elementEmptier,
  text: textEmptier,
  forceWrite: neverEmpty,
};

function removeEmpty(nodes) {
  return flatMap(nodes, function(node) {
    return emptiers[node.type](node);
  });
}

function flatMap(values, func) {
  return _.flatten(_.map(values, func), true);
}

function neverEmpty(node) {
  return [ node ];
}

function elementEmptier(element) {
  const children = removeEmpty(element.children);
  if (children.length === 0 && !ast.isVoidElement(element)) {
    return [];
  }
  return [ ast.elementWithTag(element.tag, children) ];

}

function textEmptier(node) {
  if (node.value.length === 0) {
    return [];
  }
  return [ node ];

}

module.exports = simplify;
