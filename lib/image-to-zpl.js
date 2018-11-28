// @ts-check
"use strict";
const jimp = require("jimp");
const Transform = require("stream").Transform;
// const streamToPromise = require("./stream-to-promise");
const Byte = x => 0xff & x;

const MatchEvery = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const getRepeatCode = repeatCount => {
  if (repeatCount > 419) {
    throw new Error("out of range");
  }

  let high = Math.floor(repeatCount / 20);
  let low = repeatCount % 20;

  const lowString = " GHIJKLMNOPQRSTUVWXY";
  const highString = " ghijklmnopqrstuvwxyz";

  let repeatStr = "";
  if (high > 0) {
    repeatStr += highString[high];
  }
  if (low > 0) {
    repeatStr += lowString[low];
  }

  return repeatStr;
};

const appendLine = (row, previousRow, builder) => {
  if (row.every(x => x === 0)) {
    return builder.push(",");
  }
  if (row.every(x => x === 0xff)) {
    return builder.push("!");
  }
  if (previousRow && MatchEvery(row, previousRow)) {
    return builder.push(":");
  }

  const nibbles = [];
  for (let i = 0; i < row.length; i++) {
    nibbles.push(Byte(row[i] >> 4));
    nibbles.push(Byte(row[i] & 0x0f));
  }

  for (let i = 0; i < nibbles.length; i++) {
    const cPixel = nibbles[i];

    let repeatCount = 0;
    for (let j = i; j < nibbles.length && repeatCount <= 400; j++) {
      if (cPixel === nibbles[j]) {
        repeatCount++;
      } else {
        break;
      }
    }

    if (repeatCount > 2) {
      if (
        repeatCount === nibbles.length - i &&
        (cPixel === 0 || cPixel === 0xf)
      ) {
        if (cPixel === 0) {
          if (i % 2 === 1) {
            builder.push("0");
          }
          builder.push(",");
          return;
        } else if (cPixel === 0xf) {
          if (i % 2 === 1) {
            builder.push("F");
          }
          builder.push("!");
          return;
        }
      } else {
        builder.push(getRepeatCode(repeatCount));
        i += repeatCount - 1;
      }
    }
    builder.push(cPixel.toString(16));
  }
};

const handleStream = zplInit => {
  const transform = new Transform();

  const buffers = [];
  transform._transform = (data, encoding, callback) => {
    buffers.push(data);
    callback();
  };

  transform._flush = callback => {
    // flush est appelé avant la fermeture du stream
    const buffer = Buffer.concat(buffers);
    buffers.length = 0;

    imageToZpl(buffer)
      .then(zpl => {
        zpl = zplInit ? zplInit + "\n" + zpl : zpl;
        transform.push(zpl);
        callback();
      })
      .catch(callback);
  };

  return transform;
};

const imageToZpl = image => {
  if (typeof image === "undefined") {
    return handleStream();
  }

  if (typeof image === "string") {
    return handleStream(image);
  }

  if (image instanceof Buffer) {
    // console.log(image);
    return jimp.read(image).then(imageToZpl);
  }

  if (typeof image.then === "function") {
    return image.then(imageToZpl);
  }

  // if (typeof image.pipe === "function") {
  //   return streamToPromise(image).then(imageToZpl);
  // }

  const filename = "R:TEST.GRF";
  const stride = Math.floor((image.bitmap.width + 7) / 8);
  const rightMask = Byte(0xff << (stride * 8 - image.bitmap.width));
  const zplBuilder = [];

  const rows = [];
  let currentRowBufer = [];

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(
    col,
    row,
    idx
  ) {
    // x, y is the position of this pixel on the image
    // idx is the position start position of this rgba tuple in the bitmap Buffer
    // this is the image
    if (col % 8 === 0) {
      const strideCol = Math.floor(col / 8.0);
      let byte = 0;
      for (let i = 0; i < 8; i++) {
        const red = this.bitmap.data[idx + 0 + i * 4];
        const green = this.bitmap.data[idx + 1 + i * 4];
        const blue = this.bitmap.data[idx + 2 + i * 4];
        const alpha = this.bitmap.data[idx + 3 + i * 4];
        const c = Math.floor((red + green + blue) / 3.0) * (alpha / 255.0);
        const pixl = c > 127 ? 1 : 0;
        byte = byte | (pixl << (7 - i));
      }
      let pixelData = Byte(0xff ^ byte);
      pixelData =
        strideCol === stride - 1 ? Byte(pixelData & rightMask) : pixelData;
      currentRowBufer.push(pixelData);
    }

    if (col === image.bitmap.width - 1) {
      // image scan finished, do your stuff
      // console.log("end line");
      rows.push(currentRowBufer);
      if (currentRowBufer.length !== stride) {
        throw new Error("len is not stride");
      }
      currentRowBufer = [];
    }

    if (col === image.bitmap.width - 1 && row === image.bitmap.height - 1) {
      // image scan finished, do your stuff
      if (rows.length !== image.bitmap.height) {
        throw new Error("rows.length is not image.bitmap.height");
      }
      // console.log(rows.length);
    }
  });

  let previousRow;
  const header = `^XA~DG${filename},${stride * image.bitmap.height},${stride},`;
  const builder = [header];
  for (const row of rows) {
    appendLine(row, previousRow, builder);
    previousRow = row;
  }
  builder.push("^FS^XZ");

  // console.log(builder.join(""));
  zplBuilder.push(builder.join(""));
  zplBuilder.push(`^XA^FO0,0^XG${filename},1,1^FS^XZ`);
  zplBuilder.push(`^XA^ID${filename}^FS^XZ`);

  return zplBuilder.join("\n");
};

module.exports = imageToZpl;
