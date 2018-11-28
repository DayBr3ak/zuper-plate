import { Readable } from "stream";

declare module "zuper-plate" {
  export interface PrintOpts {
    stream: Readable;
    ip: string;
    port?: number;
    type?: PRINTERS;
  }

  export const injectGsPath: (
    gsPath?: string
  ) => {
    print(opts: PrintOpts, cb: (error: any) => void): void;
    print(opts: PrintOpts): Promise<void>;
    printZpl(opts: PrintOpts): Promise<void>;
  };

  export enum PRINTERS {
    A4,
    ZEBRA,
    SATO
  }

  // printersMeta,
  // print,
  // pdfToZpl
}
