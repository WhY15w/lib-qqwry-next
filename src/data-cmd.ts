import * as fs from "node:fs";
import type { CmdApi, CmdFactory } from "./types";

export function bufferCmd(path: string): CmdFactory {
  const buffer = fs.readFileSync(path);
  const max = buffer.length;

  const api: CmdApi = {
    name: "bufferCmd",

    readBuffer(start: number, length: number): Buffer {
      start = start || 0;
      length = length || 1;
      return buffer.subarray(start, start + length);
    },

    readUIntLE(start: number, length: number): number {
      start = start || 0;
      length = length < 1 ? 1 : length > 6 ? 6 : length;
      return buffer.readUIntLE(start, length);
    },

    getStringByteArray(start: number): number[] {
      const B = start || 0;
      const toarr: number[] = [];
      for (let i = B; i < max; i++) {
        const s = buffer[i];
        if (s === 0) break;
        toarr.push(s);
      }
      return toarr;
    },

    close() {},
  };

  return () => api;
}

export function fileCmd(path: string): CmdFactory {
  return (): CmdApi => {
    let fd: number | null = null;
    let max = 0;

    function open(): void {
      fd = fs.openSync(path, "r");
      if (!max) {
        max = fs.fstatSync(fd).size;
      }
    }

    open();

    return {
      name: "fileCmd",

      readBuffer(start: number, length: number): Buffer {
        start = start || 0;
        length = length || 1;
        const buf = Buffer.alloc(length);
        fs.readSync(fd!, buf, 0, length, start);
        return buf;
      },

      readUIntLE(start: number, length: number): number {
        start = start || 0;
        length = length < 1 ? 1 : length > 6 ? 6 : length;
        return this.readBuffer(start, length).readUIntLE(0, length);
      },

      getStringByteArray(start: number): number[] {
        const B = start || 0;
        const toarr: number[] = [];
        for (let i = B; i < max; i++) {
          const s = this.readBuffer(i, 1)[0];
          if (s === 0) break;
          toarr.push(s);
        }
        return toarr;
      },

      close() {
        if (fd != null) {
          fs.closeSync(fd);
          fd = null;
        }
      },
    };
  };
}
