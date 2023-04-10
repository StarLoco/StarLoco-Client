'use strict';

const JSZip = require('jszip');

const promises = require('./promises');

exports.openArrayBuffer = openArrayBuffer;
exports.splitPath = splitPath;
exports.joinPath = joinPath;

function openArrayBuffer(arrayBuffer) {
  const zipFile = new JSZip(arrayBuffer);
  function exists(name) {
    return zipFile.file(name) !== null;
  }

  function read(name, encoding) {
    const array = zipFile.file(name).asUint8Array();
    const buffer = uint8ArrayToBuffer(array);
    if (encoding) {
      return promises.when(buffer.toString(encoding));
    }
    return promises.when(buffer);

  }

  function write(name, contents) {
    zipFile.file(name, contents);
  }

  function toBuffer() {
    return zipFile.generate({ type: 'nodebuffer' });
  }

  return {
    exists,
    read,
    write,
    toBuffer,
  };
}

function uint8ArrayToBuffer(array) {
  if (Buffer.from && Buffer.from !== Uint8Array.from) {
    return Buffer.from(array);
  }
  return new Buffer(array);
}

function splitPath(path) {
  const lastIndex = path.lastIndexOf('/');
  if (lastIndex === -1) {
    return { dirname: '', basename: path };
  }
  return {
    dirname: path.substring(0, lastIndex),
    basename: path.substring(lastIndex + 1),
  };

}

function joinPath() {
  const nonEmptyPaths = Array.prototype.filter.call(arguments, function(path) {
    return path;
  });

  let relevantPaths = [];

  nonEmptyPaths.forEach(function(path) {
    if (/^\//.test(path)) {
      relevantPaths = [ path ];
    } else {
      relevantPaths.push(path);
    }
  });

  return relevantPaths.join('/');
}
