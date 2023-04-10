'use strict';

const fs = require('fs');
const path = require('path');

const mammoth = require('./');
const promises = require('./promises');
const images = require('./images');

function main(argv) {
  const docxPath = argv['docx-path'];
  let outputPath = argv['output-path'];
  const outputDir = argv.output_dir;
  const outputFormat = argv.output_format;
  const styleMapPath = argv.style_map;

  readStyleMap(styleMapPath).then(function(styleMap) {
    const options = {
      styleMap,
      outputFormat,
    };

    if (outputDir) {
      const basename = path.basename(docxPath, '.docx');
      outputPath = path.join(outputDir, basename + '.html');
      let imageIndex = 0;
      options.convertImage = images.imgElement(function(element) {
        imageIndex++;
        const extension = element.contentType.split('/')[1];
        const filename = imageIndex + '.' + extension;

        return element.read().then(function(imageBuffer) {
          const imagePath = path.join(outputDir, filename);
          return promises.nfcall(fs.writeFile, imagePath, imageBuffer);
        }).then(function() {
          return { src: filename };
        });
      });
    }

    return mammoth.convert({ path: docxPath }, options)
      .then(function(result) {
        result.messages.forEach(function(message) {
          process.stderr.write(message.message);
          process.stderr.write('\n');
        });

        const outputStream = outputPath ? fs.createWriteStream(outputPath) : process.stdout;

        outputStream.write(result.value);
      });
  }).done();
}

function readStyleMap(styleMapPath) {
  if (styleMapPath) {
    return promises.nfcall(fs.readFile, styleMapPath, 'utf8');
  }
  return promises.resolve(null);

}

module.exports = main;
