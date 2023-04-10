'use strict';

exports.uriToZipEntryName = uriToZipEntryName;
exports.replaceFragment = replaceFragment;

function uriToZipEntryName(base, uri) {
  if (uri.charAt(0) === '/') {
    return uri.substr(1);
  }
  // In general, we should check first and second for trailing and leading slashes,
  // but in our specific case this seems to be sufficient
  return base + '/' + uri;

}


function replaceFragment(uri, fragment) {
  const hashIndex = uri.indexOf('#');
  if (hashIndex !== -1) {
    uri = uri.substring(0, hashIndex);
  }
  return uri + '#' + fragment;
}
