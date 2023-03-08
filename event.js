const { createFiles } = require("./src/main.js");

async function run(data, callback) {
  const filePaths = await createFiles(10, data.thread)
  callback(null, filePaths)
}

module.exports = { run };

