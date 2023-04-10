/* eslint-disable array-callback-return */
/* eslint-disable no-var */
/* eslint-disable no-use-before-define */
'use strict';

const _ = require('underscore');
const lop = require('lop');

const documentMatchers = require('./styles/document-matchers');
const htmlPaths = require('./styles/html-paths');
const tokenise = require('./styles/parser/tokeniser').tokenise;
const results = require('./results');

exports.readHtmlPath = readHtmlPath;
exports.readDocumentMatcher = readDocumentMatcher;
exports.readStyle = readStyle;


function readStyle(string) {
  return parseString(styleRule, string);
}

function createStyleRule() {
  return lop.rules.sequence(
    lop.rules.sequence.capture(documentMatcherRule()),
    lop.rules.tokenOfType('whitespace'),
    lop.rules.tokenOfType('arrow'),
    lop.rules.sequence.capture(lop.rules.optional(lop.rules.sequence(
      lop.rules.tokenOfType('whitespace'),
      lop.rules.sequence.capture(htmlPathRule())
    ).head())),
    lop.rules.tokenOfType('end')
  ).map(function(documentMatcher, htmlPath) {
    return {
      from: documentMatcher,
      to: htmlPath.valueOrElse(htmlPaths.empty),
    };
  });
}

function readDocumentMatcher(string) {
  return parseString(documentMatcherRule(), string);
}

function documentMatcherRule() {
  const sequence = lop.rules.sequence;

  const identifierToConstant = function(identifier, constant) {
    return lop.rules.then(
      lop.rules.token('identifier', identifier),
      function() {
        return constant;
      }
    );
  };

  const paragraphRule = identifierToConstant('p', documentMatchers.paragraph);
  const runRule = identifierToConstant('r', documentMatchers.run);

  const elementTypeRule = lop.rules.firstOf('p or r or table',
    paragraphRule,
    runRule
  );

  const styleIdRule = lop.rules.then(
    classRule,
    function(styleId) {
      return { styleId };
    }
  );

  const styleNameMatcherRule = lop.rules.firstOf('style name matcher',
    lop.rules.then(
      lop.rules.sequence(
        lop.rules.tokenOfType('equals'),
        lop.rules.sequence.cut(),
        lop.rules.sequence.capture(stringRule)
      ).head(),
      function(styleName) {
        return { styleName: documentMatchers.equalTo(styleName) };
      }
    ),
    lop.rules.then(
      lop.rules.sequence(
        lop.rules.tokenOfType('startsWith'),
        lop.rules.sequence.cut(),
        lop.rules.sequence.capture(stringRule)
      ).head(),
      function(styleName) {
        return { styleName: documentMatchers.startsWith(styleName) };
      }
    )
  );

  const styleNameRule = lop.rules.sequence(
    lop.rules.tokenOfType('open-square-bracket'),
    lop.rules.sequence.cut(),
    lop.rules.token('identifier', 'style-name'),
    lop.rules.sequence.capture(styleNameMatcherRule),
    lop.rules.tokenOfType('close-square-bracket')
  ).head();


  const listTypeRule = lop.rules.firstOf('list type',
    identifierToConstant('ordered-list', { isOrdered: true }),
    identifierToConstant('unordered-list', { isOrdered: false })
  );
  const listRule = sequence(
    lop.rules.tokenOfType('colon'),
    sequence.capture(listTypeRule),
    sequence.cut(),
    lop.rules.tokenOfType('open-paren'),
    sequence.capture(integerRule),
    lop.rules.tokenOfType('close-paren')
  ).map(function(listType, levelNumber) {
    return {
      list: {
        isOrdered: listType.isOrdered,
        levelIndex: levelNumber - 1,
      },
    };
  });

  function createMatcherSuffixesRule(rules) {
    const matcherSuffix = lop.rules.firstOf.apply(
      lop.rules.firstOf,
      [ 'matcher suffix' ].concat(rules)
    );
    const matcherSuffixes = lop.rules.zeroOrMore(matcherSuffix);
    return lop.rules.then(matcherSuffixes, function(suffixes) {
      const matcherOptions = {};
      suffixes.forEach(function(suffix) {
        _.extend(matcherOptions, suffix);
      });
      return matcherOptions;
    });
  }

  const paragraphOrRun = sequence(
    sequence.capture(elementTypeRule),
    sequence.capture(createMatcherSuffixesRule([
      styleIdRule,
      styleNameRule,
      listRule,
    ]))
  ).map(function(createMatcher, matcherOptions) {
    return createMatcher(matcherOptions);
  });

  const table = sequence(
    lop.rules.token('identifier', 'table'),
    sequence.capture(createMatcherSuffixesRule([
      styleIdRule,
      styleNameRule,
    ]))
  ).map(function(options) {
    return documentMatchers.table(options);
  });

  const bold = identifierToConstant('b', documentMatchers.bold);
  const italic = identifierToConstant('i', documentMatchers.italic);
  const underline = identifierToConstant('u', documentMatchers.underline);
  const strikethrough = identifierToConstant('strike', documentMatchers.strikethrough);
  const allCaps = identifierToConstant('all-caps', documentMatchers.allCaps);
  const smallCaps = identifierToConstant('small-caps', documentMatchers.smallCaps);
  const commentReference = identifierToConstant('comment-reference', documentMatchers.commentReference);

  const breakMatcher = sequence(
    lop.rules.token('identifier', 'br'),
    sequence.cut(),
    lop.rules.tokenOfType('open-square-bracket'),
    lop.rules.token('identifier', 'type'),
    lop.rules.tokenOfType('equals'),
    sequence.capture(stringRule),
    lop.rules.tokenOfType('close-square-bracket')
  ).map(function(breakType) {
    switch (breakType) {
      case 'line':
        return documentMatchers.lineBreak;
      case 'page':
        return documentMatchers.pageBreak;
      case 'column':
        return documentMatchers.columnBreak;
      default:
            // TODO: handle unknown document matchers
    }
  });

  return lop.rules.firstOf('element type',
    paragraphOrRun,
    table,
    bold,
    italic,
    underline,
    strikethrough,
    allCaps,
    smallCaps,
    commentReference,
    breakMatcher
  );
}

function readHtmlPath(string) {
  return parseString(htmlPathRule(), string);
}

function htmlPathRule() {
  const capture = lop.rules.sequence.capture;
  const whitespaceRule = lop.rules.tokenOfType('whitespace');
  const freshRule = lop.rules.then(
    lop.rules.optional(lop.rules.sequence(
      lop.rules.tokenOfType('colon'),
      lop.rules.token('identifier', 'fresh')
    )),
    function(option) {
      return option.map(function() {
        return true;
      }).valueOrElse(false);
    }
  );

  const separatorRule = lop.rules.then(
    lop.rules.optional(lop.rules.sequence(
      lop.rules.tokenOfType('colon'),
      lop.rules.token('identifier', 'separator'),
      lop.rules.tokenOfType('open-paren'),
      capture(stringRule),
      lop.rules.tokenOfType('close-paren')
    ).head()),
    function(option) {
      return option.valueOrElse('');
    }
  );

  const tagNamesRule = lop.rules.oneOrMoreWithSeparator(
    identifierRule,
    lop.rules.tokenOfType('choice')
  );

  const styleElementRule = lop.rules.sequence(
    capture(tagNamesRule),
    capture(lop.rules.zeroOrMore(classRule)),
    capture(freshRule),
    capture(separatorRule)
  ).map(function(tagName, classNames, fresh, separator) {
    const attributes = {};
    const options = {};
    if (classNames.length > 0) {
      attributes.class = classNames.join(' ');
    }
    if (fresh) {
      options.fresh = true;
    }
    if (separator) {
      options.separator = separator;
    }
    return htmlPaths.element(tagName, attributes, options);
  });

  return lop.rules.firstOf('html path',
    lop.rules.then(lop.rules.tokenOfType('bang'), function() {
      return htmlPaths.ignore;
    }),
    lop.rules.then(
      lop.rules.zeroOrMoreWithSeparator(
        styleElementRule,
        lop.rules.sequence(
          whitespaceRule,
          lop.rules.tokenOfType('gt'),
          whitespaceRule
        )
      ),
      htmlPaths.elements
    )
  );
}

var identifierRule = lop.rules.then(
  lop.rules.tokenOfType('identifier'),
  decodeEscapeSequences
);

var integerRule = lop.rules.tokenOfType('integer');

var stringRule = lop.rules.then(
  lop.rules.tokenOfType('string'),
  decodeEscapeSequences
);

const escapeSequences = {
  n: '\n',
  r: '\r',
  t: '\t',
};

function decodeEscapeSequences(value) {
  return value.replace(/\\(.)/g, function(match, code) {
    return escapeSequences[code] || code;
  });
}

var classRule = lop.rules.sequence(
  lop.rules.tokenOfType('dot'),
  lop.rules.sequence.cut(),
  lop.rules.sequence.capture(identifierRule)
).head();

function parseString(rule, string) {
  const tokens = tokenise(string);
  const parser = lop.Parser();
  const parseResult = parser.parseTokens(rule, tokens);
  if (parseResult.isSuccess()) {
    return results.success(parseResult.value());
  }
  return new results.Result(null, [ results.warning(describeFailure(string, parseResult)) ]);

}

function describeFailure(input, parseResult) {
  return 'Did not understand this style mapping, so ignored it: ' + input + '\n' +
        parseResult.errors().map(describeError).join('\n');
}

function describeError(error) {
  return 'Error was at character number ' + error.characterNumber() + ': ' +
        'Expected ' + error.expected + ' but got ' + error.actual;
}

var styleRule = createStyleRule();
