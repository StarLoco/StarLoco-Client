'use strict';

exports.readStylesXml = readStylesXml;
exports.Styles = Styles;
exports.defaultStyles = new Styles({}, {});

function Styles(paragraphStyles, characterStyles, tableStyles, numberingStyles) {
  return {
    findParagraphStyleById(styleId) {
      return paragraphStyles[styleId];
    },
    findCharacterStyleById(styleId) {
      return characterStyles[styleId];
    },
    findTableStyleById(styleId) {
      return tableStyles[styleId];
    },
    findNumberingStyleById(styleId) {
      return numberingStyles[styleId];
    },
  };
}

Styles.EMPTY = new Styles({}, {}, {}, {});

function readStylesXml(root) {
  const paragraphStyles = {};
  const characterStyles = {};
  const tableStyles = {};
  const numberingStyles = {};

  const styles = {
    paragraph: paragraphStyles,
    character: characterStyles,
    table: tableStyles,
  };

  root.getElementsByTagName('w:style').forEach(function(styleElement) {
    const style = readStyleElement(styleElement);
    if (style.type === 'numbering') {
      numberingStyles[style.styleId] = readNumberingStyleElement(styleElement);
    } else {
      const styleSet = styles[style.type];
      if (styleSet) {
        styleSet[style.styleId] = style;
      }
    }
  });

  return new Styles(paragraphStyles, characterStyles, tableStyles, numberingStyles);
}

// 完善该函数，为样式表提供更多的样式信息
function readStyleElement(styleElement) {
  const type = styleElement.attributes['w:type'];
  const styleId = styleElement.attributes['w:styleId'];
  const name = styleName(styleElement);
  const alignment = styleElement.firstOrEmpty('w:pPr').firstOrEmpty('w:jc').attributes['w:val'];
  return {
    type,
    styleId,
    name,
    alignment,
  };
}

function styleName(styleElement) {
  const nameElement = styleElement.first('w:name');
  return nameElement ? nameElement.attributes['w:val'] : null;
}

function readNumberingStyleElement(styleElement) {
  const numId = styleElement
    .firstOrEmpty('w:pPr')
    .firstOrEmpty('w:numPr')
    .firstOrEmpty('w:numId')
    .attributes['w:val'];
  return { numId };
}
