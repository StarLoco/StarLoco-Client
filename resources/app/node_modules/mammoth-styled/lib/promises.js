'use strict';

const _ = require('underscore');
const bluebird = require('bluebird/js/release/promise')();

exports.defer = defer;
exports.when = bluebird.resolve;
exports.resolve = bluebird.resolve;
exports.all = bluebird.all;
exports.props = bluebird.props;
exports.reject = bluebird.reject;
exports.promisify = bluebird.promisify;
exports.mapSeries = bluebird.mapSeries;
exports.attempt = bluebird.attempt;

exports.nfcall = function(func) {
  const args = Array.prototype.slice.call(arguments, 1);
  const promisedFunc = bluebird.promisify(func);
  return promisedFunc.apply(null, args);
};

bluebird.prototype.fail = bluebird.prototype.caught;

bluebird.prototype.also = function(func) {
  return this.then(function(value) {
    const returnValue = _.extend({}, value, func(value));
    return bluebird.props(returnValue);
  });
};

function defer() {
  let resolve;
  let reject;
  const promise = new bluebird.Promise(function(resolveArg, rejectArg) {
    resolve = resolveArg;
    reject = rejectArg;
  });

  return {
    resolve,
    reject,
    promise,
  };
}
