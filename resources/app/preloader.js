'use strict';
const fs = require('fs')
const path = require("path")
if (fs.existsSync(path.join(__dirname, "main.jsc"))) {
  // Muhuhu
  require("bytenode")
  require(path.join(__dirname, "main.jsc"))
} else if (process.defaultApp && fs.existsSync(path.join(__dirname, "main.js"))) {
  // Quelle aubaine, un fichier source tout beau tout lisible ! On le charge...
  require(path.join(__dirname, "main.js"))
} else {
  // N'arrive jamais sauf si la matrice est quelque peu distordue
  const app = require("electron").app
  app.exit(666) // (°~°)
}