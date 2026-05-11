import createQqwry, { ipToInt, intToIP, ipEndianChange } from "./driver";
import { createIpdb } from "./ipdb-driver";
import type { QqwryCallable, IpdbCallable, IpdbOptions } from "./types";

/**
 * lib-qqwry
 * 纯真IP库(qqwry.dat) Node.js 解析引擎
 */

const libqqwry = Object.assign(createQqwry, {
  ipToInt,
  intToIP,
  ipEndianChange,
  ipdb(dataPath?: string, options?: IpdbOptions): IpdbCallable {
    return createIpdb(dataPath, options);
  },
  init(speed?: boolean | string, dataPath?: boolean | string): QqwryCallable {
    return createQqwry(
      speed as boolean | undefined,
      dataPath as string | undefined,
    );
  },
});

export default libqqwry;
