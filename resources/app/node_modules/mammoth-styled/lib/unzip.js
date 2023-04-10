'use strict';

exports.openZip = openZip;

const fs = require('fs');

const promises = require('./promises');
const zipfile = require('./zipfile');

exports.openZip = openZip;

const readFile = promises.promisify(fs.readFile);

function openZip(options) {
  if (options.path) {
    return readFile(options.path).then(zipfile.openArrayBuffer);
  } else if (options.buffer) {
    return promises.resolve(zipfile.openArrayBuffer(options.buffer));
  } else if (options.file) {
    return promises.resolve(options.file);
  }
  return promises.reject(new Error('Could not find file in options'));
}
