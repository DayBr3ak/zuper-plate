// @ts-check
"use strict";

const spawn = require("child_process").spawn;
const Transform = require("stream").Transform;

function fromPdf(gsPath, { dpi = 300, width = 1025, height = 1500 } = {}) {
  const W = Math.floor((dpi * width) / 254.0);
  const H = Math.floor((dpi * height) / 254.0);

  const resize = "-g" + W + "x" + H;

  const cmd = [
    "-sDEVICE=bmpmono",
    "-sOutputFile=%stdout",
    "-q",
    "-r" + dpi,
    resize,
    "-dPDFFitPage",
    "-"
  ];
  if (!gsPath) {
    throw new Error("GS_EXE environment variable must be set");
  }
  const p = spawn(gsPath, cmd);

  p.stderr.pipe(process.stderr);
  let cacheError;
  const onError = e => (cacheError = e);
  p.on("error", onError);

  const t = new Transform();
  t._transform = (data, encoding, callback) => {
    if (cacheError) {
      callback(cacheError);
      return t.destroy();
    }
    p.stdin.write(data);
    callback();
  };

  t._flush = callback => {
    if (cacheError) {
      callback(cacheError);
      return t.destroy();
    }
    p.removeListener("error", onError);
    p.on("error", callback);
    p.stdin.end();
    p.stdout.on("data", data => t.push(data));
    p.stdout.on("end", callback);
  };

  return t;
}

module.exports = fromPdf;
