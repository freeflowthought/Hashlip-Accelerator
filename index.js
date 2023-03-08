const myArgs = process.argv.slice(2);
const { buildSetup, createMetaData } = require("./src/main.js");
var pool = require('multi-child-process');
var procPool = new pool.initPool();

async function runThread() {
  const time = new Date()
  for (let i = 0; i < 7; i++) {
    pool.initChildProc(__dirname + '/event.js', 'run', { thread: i }, function (err, ret) {
      createMetaData(ret, `thread_${i}_metadata.json`)
    });
  }

  procPool.on('isAllAvail', () => {
    console.log('isAllAvail');
    pool.closePool(function (err, ret) {
      console.log('close triggered')
      console.log('time used', (new Date() - time) / 1000);
    });
  });
}

(async () => {
  buildSetup().then(() => {
    runThread()
  })
})();

