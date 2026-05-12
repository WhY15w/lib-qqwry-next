import { readFileSync } from "node:fs";
import { isIPv4, isIPv6 } from "node:net";
import type { IpdbCmdApi, IpdbCmdFactory } from "./types";

function ipToBytes(addr: string): number[] {
  if (isIPv4(addr)) {
    return addr.split(".").map((p) => parseInt(p, 10));
  }

  let normalized: string;
  if (addr.includes("::")) {
    const [pre, post] = addr.split("::", 2);
    const preParts = pre ? pre.split(":").filter((p) => p !== "") : [];
    const postParts = post ? post.split(":").filter((p) => p !== "") : [];
    const missing = 8 - preParts.length - postParts.length;
    const zeros = Array(Math.max(0, missing)).fill("0");
    normalized = [...preParts, ...zeros, ...postParts].join(":");
  } else {
    normalized = addr;
  }

  const bytes: number[] = [];
  for (const part of normalized.split(":")) {
    const val = parseInt(part || "0", 16);
    bytes.push((val >> 8) & 0xff, val & 0xff);
  }
  return bytes;
}

export default function ipdbCmd(dataPath: string): IpdbCmdFactory {
  const data = readFileSync(dataPath);

  const metaLength = data.readInt32BE(0);
  const metaJson = data.subarray(4, 4 + metaLength).toString();
  const meta = JSON.parse(metaJson);
  const body = data.subarray(4 + metaLength);

  const nodeCount: number = meta.node_count;
  const fieldsList: string[] = meta.fields;
  const langMap: Record<string, number> = meta.languages;
  const build: number = meta.build;
  const ipVersion: number = meta.ip_version || 0;

  let v4offset = 0;

  function readNode(node: number, idx: number): number {
    const off = idx * 4 + node * 8;
    return body.readUInt32BE(off);
  }

  function findNode(addr: string): number {
    const ipv = ipToBytes(addr);
    const bitCount = ipv.length * 8;

    let node = 0;
    let idx = 0;

    if (bitCount === 32) {
      if (v4offset === 0) {
        for (let i = 0; i < 96; i++) {
          if (i >= 80) {
            node = readNode(node, 1);
          } else {
            node = readNode(node, 0);
          }
        }
        v4offset = node;
      } else {
        node = v4offset;
      }
    }

    while (idx < bitCount) {
      if (node > nodeCount) break;
      const bit = 1 & (ipv[idx >> 3] >> (7 - (idx % 8)));
      node = readNode(node, bit);
      idx++;
    }

    if (node > nodeCount) {
      return node;
    }
    return -1;
  }

  function resolveNode(node: number): Buffer {
    const resolved = node - nodeCount + nodeCount * 8;
    const size = (body[resolved] << 8) | body[resolved + 1];
    if (resolved + 2 + size > body.length) {
      throw new Error("database is error");
    }
    return body.subarray(resolved + 2, resolved + 2 + size);
  }

  const api: IpdbCmdApi = {
    find(addr: string, language: string): string[] {
      if (language === undefined) {
        throw new Error("param language is undefined");
      }

      if (isIPv4(addr) && !(ipVersion & 0x01)) {
        throw new Error("database not support ipv4");
      }
      if (isIPv6(addr) && !(ipVersion & 0x02)) {
        throw new Error("database not support ipv6");
      }

      const node = findNode(addr);
      if (node <= 0) {
        return [];
      }

      const buf = resolveNode(node);
      const tmp = buf.toString().split("\t");
      const off = langMap[language];

      return tmp.slice(off, off + fieldsList.length);
    },

    fields(): string[] {
      return fieldsList;
    },

    languages(): string[] {
      return Object.keys(langMap);
    },

    buildTime(): number {
      return build;
    },

    close() {},
  };

  return () => api;
}
