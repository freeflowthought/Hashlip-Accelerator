const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const console = require("console");
const { layersOrder, format, rarity } = require("./config.js");
const rimraf = require('rimraf');

const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");

if (!process.env.PWD) {
  process.env.PWD = process.cwd();
}

const buildDir = `${process.env.PWD}/build`;
const metDataFile = '_metadata.json';
const layersDir = `${process.env.PWD}/layers`;

let metadata = [];
let attributes = [];
let hash = [];
let decodedHash = [];
const Exists = new Set();

//change to for loop
const addRarity = _str => {
  let itemRarity;
  for (let i = 0; i < rarity.length; i++) {
    if (_str.includes(rarity[i].key)) {
      itemRarity = rarity[i].val
      console.log(itemRarity)
    }
  }


  return itemRarity;
};

//when dealing with large array, for loop is more performant and also gives more control
const cleanName = _str => {
  //get rid of the extension
  let name = _str.slice(0, -4);
  for (let i = 0; i < rarity.length; i++) {
    name = name.replace(rarity[i].key, "");
  }
  return name;
};

//this function filter the item and then return the object that being cleaned
const getElements = (path) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      return {
        id: index + 1,
        name: cleanName(i),
        fileName: i,
        rarity: addRarity(i),
      };
    });
};



const layersSetup = layersOrder => {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    name: layerObj.name,
    location: `${layersDir}/${layerObj.name}/`,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    position: { x: 0, y: 0 },
    size: { width: format.width, height: format.height },
    number: layerObj.number
  })
  );

  return layers;
};


//skip the creation if it already exists
const buildSetup = async () => {
  if (fs.existsSync(buildDir)) {
    await rimraf(buildDir)
  }
  fs.mkdirSync(buildDir);
};

//change to async in this function
const saveLayer = async (canvas, edition, thread) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(`${buildDir}/thread_${thread}_${edition}.png`, canvas.toBuffer("image/png"), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

//_edition is i
const addMetadata = (_edition, thread) => {
  let dateTime = Date.now();
  let tempMetadata = {
    hash: hash.join(""),
    decodedHash: decodedHash,
    edition: `thread_${thread}_${_edition}`,
    date: dateTime,
    attributes: attributes,
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
};

const addAttributes = (_element, _layer) => {
  let tempAttr = {
    id: _element.id,
    layer: _layer.name,
    name: _element.name,
    rarity: _element.rarity,
  };
  attributes.push(tempAttr);
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
};

const drawLayer = async (_layer, _edition, thread) => {
  const rand = Math.random();
  let element =
    _layer.elements[Math.floor(rand * _layer.number)] ? _layer.elements[Math.floor(rand * _layer.number)] : null;
  if (element) {
    addAttributes(element, _layer);
    const image = await loadImage(`${_layer.location}${element.fileName}`);

    ctx.drawImage(
      image,
      _layer.position.x,
      _layer.position.y,
      _layer.size.width,
      _layer.size.height
    );
    saveLayer(canvas, _edition, thread);
  }
};

const createFiles = async (edition, thread) => {
  const layers = layersSetup(layersOrder);
  let numDupes = 0;
  let drawLayerPromises = [];
  for (let i = 1; i <= edition; i++) {
    
    for (let j = 0; j < layers.length; j++) {
      drawLayerPromises.push(drawLayer(layers[j], i, thread));
    }
    //instead of await each of them, use promise.all
    addMetadata(i, thread);
    // let key = hash.toString();
    // if (Exists.has(key)) {
    //   console.log(
    //     `Duplicate creation for edition ${i}. Same as edition ${Exists.get(
    //       key
    //     )}`
    //   );
    //   numDupes++;
    //   if (numDupes > edition) break;
    //   i--;
    // } else {
    //   //as we don't need use key value pair, use set would give more advantages
    //   Exists.add(key);
    //   addMetadata(i, thread);
    //   console.log("Creating edition " + i);
    // }
  }
  await Promise.all(drawLayerPromises);
  return metadata
};


const createMetaData = (data, filename) => {
  fs.stat(`${buildDir}/${filename}`, (err) => {
    if (err == null || err.code === 'ENOENT') {
      fs.writeFileSync(`${buildDir}/${filename}`, JSON.stringify(data, null, 2));
    } else {
      console.log('Oh no, error: ', err.code);
    }
  });
};

module.exports = { buildSetup, createFiles, createMetaData };