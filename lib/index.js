"use strict";
const pipeline = require("stream.pipeline-shim");

const { printZebra, printSato, rawPrint } = require("./print-zpl");
const pdfToImage = require("./pdf-to-image");
const imageToZpl = require("./image-to-zpl");

const PRINTERS = {
  A4: "a4",
  ZEBRA: "zebra",
  SATO: "sato"
};

const printersMeta = {
  sato: {
    dpi: 203,
    width: 1025,
    height: 1500
  },
  zebra: {
    dpi: 300,
    width: 1025,
    height: 1500
  }
};

const makeData = ({ type = PRINTERS.ZEBRA, ip, port = 9100 } = {}) => ({
  type: type.toLowerCase(),
  ip,
  port,
  ...printersMeta[type]
});

const makePrintStream = data => {
  const { type, ip, port } = data;

  if (type === PRINTERS.ZEBRA) {
    return printZebra(ip, { port });
  } else if (type === PRINTERS.SATO) {
    return printSato(ip, { port });
  } else if (type === PRINTERS.A4) {
    return rawPrint(ip, { port });
  }
};

function injectGsPath(gsPath = process.env.GS_EXE) {
  function print({ stream, ...data }, cb) {
    if (typeof cb === "undefined") {
      return new Promise((resolve, reject) => {
        print({ stream, ...data }, e => {
          if (e) return reject(e);
          resolve();
        });
      });
    }

    data = makeData(data);
    const streams = [stream];
    if (data && data.type !== PRINTERS.A4) {
      streams.push(pdfToImage(gsPath, data), imageToZpl());
    }
    streams.push(makePrintStream(data));
    return pipeline(...streams, cb);
  }

  function printZpl({ stream, ...data }, cb) {
    if (typeof cb === "undefined") {
      return new Promise((resolve, reject) => {
        printZpl({ stream, ...data }, e => {
          if (e) return reject(e);
          resolve();
        });
      });
    }

    data = makeData(data);
    const streams = [stream];
    streams.push(makePrintStream(data));
    return pipeline(...streams, cb);
  }

  function pdfToZpl({ stream, ...data }, cb) {
    if (typeof cb === "undefined") {
      return new Promise((resolve, reject) => {
        pdfToZpl({ stream, ...data }, e => {
          if (e) return reject(e);
          resolve();
        });
      });
    }

    data = makeData(data);
    const streams = [stream];
    if (data && data.type === PRINTERS.A4) {
      return cb(new Error("no zpl for " + data.type));
    }
    streams.push(pdfToImage(gsPath, data), imageToZpl());
    return pipeline(...streams, cb);
  }

  return {
    print,
    pdfToZpl,
    printZpl
  };
}

module.exports = {
  PRINTERS,
  printersMeta,
  injectGsPath
};
