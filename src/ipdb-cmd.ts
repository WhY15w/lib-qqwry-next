import { createRequire } from "node:module";
import type { IpdbCmdApi, IpdbCmdFactory } from "./types";

const _require = createRequire(import.meta.url);

interface IpdbReader {
  find(addr: string, language: string): string[];
  fields(): string[];
  languages(): string[];
  buildTime(): number;
}

const Reader: new (path: string) => IpdbReader = _require(
  "ipip-ipdb/lib/reader",
);

export default function ipdbCmd(dataPath: string): IpdbCmdFactory {
  const reader = new Reader(dataPath);

  const api: IpdbCmdApi = {
    name: "ipdbCmd",

    find(addr: string, language: string): string[] {
      return reader.find(addr, language);
    },

    fields(): string[] {
      return reader.fields();
    },

    languages(): string[] {
      return reader.languages();
    },

    buildTime(): number {
      return reader.buildTime();
    },

    close() {},
  };

  return () => api;
}
