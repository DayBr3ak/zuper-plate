// @ts-check
"use strict";

const net = require("net");
const satoZplInit = `CT~~CD,~CC^~CT~^XA~TA000~JSN^LT0^MNW^MTD^PON^PMN^LH0,0^JMA^PR4,4~SD15^JUS^LRN^CI0^XZ^XA^MMT^PW1248^LL1772^LS0`;
const zebraInit = `CT~~CD,~CC^~CT~
^XA~TA000~JSN^LT0^MNW^MTD^PON^PMN^LH0,0^JMA^PR4,4~SD15^JUS^LRN^CI0^XZ
^XA
^MMT
^PW1248
^LL1772
^LS0`

function printStream(ip, port, initData) {
  const sock = net.createConnection(port, ip);

  if (typeof initData === "string" && initData.length) {
    const w = sock._write;
    sock._write = function(chunk, encoding, callback) {
      sock._write = w;
      sock.push(initData + "\n");
      sock._write(chunk, encoding, callback);
    };
  }

  return sock;
}
const printZebra = (ip = "192.168.1.113", { port = 9100 } = {}) =>
  printStream(ip, port, zebraInit);
const printSato = (ip = "192.168.15.57", { port = 9100 } = {}) =>
  printStream(ip, port, satoZplInit);
const rawPrint = (ip, { port = 9100, initData = undefined } = {}) =>
  printStream(ip, port, initData);

module.exports = {
  printZebra,
  printSato,
  rawPrint
};
