import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { decode as GBK_decode } from "gbk.js";
import { fileCmd, bufferCmd } from "./data-cmd";
import getFormatFn from "./format";
import type {
  CmdApi,
  CmdFactory,
  IpInfo,
  IpScopeInfo,
  StreamOptions,
  QqwryCallable,
} from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IP_RECORD_LENGTH = 7;
const REDIRECT_MODE_1 = 1;
const REDIRECT_MODE_2 = 2;
const IP_REGEXP =
  /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;

const defaultDatPath = path.join(__dirname, "../data/qqwry.dat");

const unArea = "";
const unCountry = "";

function getCmdFactory(isspeed: boolean, p: string): CmdFactory {
  return isspeed ? bufferCmd(p) : fileCmd(p);
}

/**
 * IP地址转数值
 */
export function ipToInt(IP: string | number): number {
  let ip: number;
  if (typeof IP === "string") {
    const result = IP_REGEXP.exec(IP);
    if (result) {
      const ipArr = result.slice(1);
      ip =
        ((parseInt(ipArr[0]) << 24) |
          (parseInt(ipArr[1]) << 16) |
          (parseInt(ipArr[2]) << 8) |
          parseInt(ipArr[3])) >>>
        0;
    } else if (
      /^\d+$/.test(IP) &&
      (ip = parseInt(IP)) >= 0 &&
      ip <= 0xffffffff
    ) {
      ip = +IP;
    } else {
      throw new Error("The IP address is not normal! >> " + IP);
    }
  } else if (IP >= 0 && IP <= 0xffffffff) {
    ip = IP;
  } else {
    throw new Error("The IP address is not normal! >> " + IP);
  }
  return ip;
}

/**
 * 数值转IP地址
 */
export function intToIP(int: number): string {
  if (int < 0 || int > 0xffffffff) {
    throw new Error("The IP number is not normal! >> " + int);
  }
  return (
    (int >>> 24) +
    "." +
    ((int >>> 16) & 0xff) +
    "." +
    ((int >>> 8) & 0xff) +
    "." +
    (int & 0xff)
  );
}

/**
 * 32位 Big Endian 与 Little Endian 数值互转
 */
export function ipEndianChange(int: number): number {
  int = int & 0xffffffff;
  return (
    ((int >>> 24) |
      ((int >> 8) & 0xff00) |
      ((int << 8) & 0xff0000) |
      (int << 24)) >>>
    0
  );
}

function getMiddleOffset(
  begin: number,
  end: number,
  recordLength: number,
): number {
  const records = (((end - begin) / recordLength) >> 1) * recordLength + begin;
  return records ^ begin ? records : records + recordLength;
}

class QqwryDriverImpl {
  readonly ipBegin: number;
  readonly ipEnd: number;
  readonly dataPath: string;
  private cmdFactory: CmdFactory;
  private _speed: boolean;

  constructor(speed?: boolean | string, dataPath?: boolean | string) {
    let isspeed: boolean;
    if (typeof speed === "string") {
      this.dataPath = speed || defaultDatPath;
      isspeed = !!dataPath;
    } else {
      isspeed = !!speed;
      this.dataPath =
        (typeof dataPath === "string" ? dataPath : undefined) || defaultDatPath;
    }
    this._speed = isspeed;
    this.cmdFactory = getCmdFactory(isspeed, this.dataPath);
    const cmd = this.cmdFactory();
    this.ipBegin = cmd.readUIntLE(0, 4);
    this.ipEnd = cmd.readUIntLE(4, 4);
    cmd.close();
  }

  speed(): this {
    if (this._speed) return this;
    this._speed = true;
    this.cmdFactory = getCmdFactory(true, this.dataPath);
    return this;
  }

  unSpeed(): this {
    if (!this._speed) return this;
    this._speed = false;
    this.cmdFactory = getCmdFactory(false, this.dataPath);
    return this;
  }

  searchIP(IP: string | number): IpInfo {
    const cmd = this.cmdFactory();
    const ip = ipToInt(IP);
    const g = this.locateIP(ip, cmd);

    if (g === -1) {
      cmd.close();
      return { int: ip, ip: intToIP(ip), Country: unArea, Area: unCountry };
    }

    const addr = this.setIPLocation(g, cmd);
    cmd.close();
    return { int: ip, ip: intToIP(ip), Country: addr.Country, Area: addr.Area };
  }

  searchIPScope(bginIP: string | number, endIP: string | number): IpScopeInfo[];
  searchIPScope(
    bginIP: string | number,
    endIP: string | number,
    callback: (err: Error | null, data: IpScopeInfo[]) => void,
  ): void;
  searchIPScope(
    bginIP: string | number,
    endIP: string | number,
    callback?: (err: Error | null, data: IpScopeInfo[]) => void,
  ): IpScopeInfo[] | void {
    if (typeof callback === "function") {
      process.nextTick(() => {
        try {
          callback(null, this.searchIPScope(bginIP, endIP) as IpScopeInfo[]);
        } catch (e) {
          callback(e as Error, []);
        }
      });
      return;
    }

    const cmd = this.cmdFactory();
    const ip1 = ipToInt(bginIP);
    const ip2 = ipToInt(endIP);
    const bg = this.locateIP(ip1, cmd);
    const eg = this.locateIP(ip2, cmd);
    const ips: IpScopeInfo[] = [];

    for (let i = bg; i <= eg; i += IP_RECORD_LENGTH) {
      const addr = this.setIPLocation(i, cmd);
      ips.push({
        begInt: cmd.readUIntLE(i, 4),
        endInt: cmd.readUIntLE(cmd.readUIntLE(i + 4, 3), 4),
        begIP: intToIP(cmd.readUIntLE(i, 4)),
        endIP: intToIP(cmd.readUIntLE(cmd.readUIntLE(i + 4, 3), 4)),
        Country: addr.Country,
        Area: addr.Area,
      });
    }

    cmd.close();
    return ips;
  }

  searchIPScopeStream(
    bginIP: string | number,
    endIP: string | number,
    options?: StreamOptions,
  ): Readable {
    const opts = options || {};
    const format = opts.format;
    const objectMode = format === "object";
    const outHeader = opts.outHeader === undefined ? false : !!opts.outHeader;
    const cmd = this.cmdFactory();
    const formatFn = getFormatFn(format);

    const ip1 = ipToInt(bginIP);
    const ip2 = ipToInt(endIP);
    const bg = this.locateIP(ip1, cmd);
    const eg = this.locateIP(ip2, cmd);

    const self = this;
    let i = bg;

    const outStream = new Readable({
      objectMode: objectMode,
      destroy(
        this: Readable,
        err: Error | null,
        callback: (error: Error | null) => void,
      ) {
        cmd.close();
        callback(err);
      },
    });

    outStream._read = function (this: Readable, _size: number) {
      if (i > eg) {
        cmd.close();
        this.push(null);
        return;
      }

      const addr = self.setIPLocation(i, cmd);
      const begInt = cmd.readUIntLE(i, 4);
      const endInt = cmd.readUIntLE(cmd.readUIntLE(i + 4, 3), 4);
      const begIP = intToIP(begInt);
      const endIP = intToIP(endInt);
      const Country = addr.Country;
      const Area = addr.Area;

      let outstr: string;
      switch (format) {
        case "csv":
          if (i === bg && outHeader) {
            outstr = formatFn([
              "begInt",
              "endInt",
              "begIP",
              "endIP",
              "Country",
              "Area",
            ]);
            if (outstr) this.push(outstr);
          }
          outstr = formatFn([begInt, endInt, begIP, endIP, Country, Area]);
          this.push(outstr);
          break;
        case "json":
          outstr = "";
          if (i === bg) outstr += "[";
          outstr += formatFn(
            outHeader
              ? { begInt, endInt, begIP, endIP, Country, Area }
              : [begInt, endInt, begIP, endIP, Country, Area],
          );
          outstr += i === eg ? "]\n" : ",";
          this.push(outstr);
          break;
        case "object":
        case "text":
        default:
          this.push(formatFn([begInt, endInt, begIP, endIP, Country, Area]));
          break;
      }

      i += IP_RECORD_LENGTH;
    };

    return outStream;
  }

  private locateIP(ip: number, cmd: CmdApi): number {
    let g = 0;
    let temp: number;

    for (let b = this.ipBegin, e = this.ipEnd; b < e; ) {
      g = getMiddleOffset(b, e, IP_RECORD_LENGTH);
      temp = cmd.readUIntLE(g, 4);

      if (ip > temp) {
        b = g;
      } else if (ip < temp) {
        if (g === e) {
          g -= IP_RECORD_LENGTH;
          break;
        }
        e = g;
      } else {
        break;
      }
    }
    return g;
  }

  private setIPLocation(
    g: number,
    cmd: CmdApi,
  ): { Country: string; Area: string } {
    let ipwz = cmd.readUIntLE(g + 4, 3) + 4;
    let lx = cmd.readUIntLE(ipwz, 1);
    const loc: { Country: string; Area: string } = {
      Country: "",
      Area: "",
    };

    if (lx === REDIRECT_MODE_1) {
      ipwz = cmd.readUIntLE(ipwz + 1, 3);
      lx = cmd.readUIntLE(ipwz, 1);

      if (lx === REDIRECT_MODE_2) {
        const Gjbut = cmd.getStringByteArray(cmd.readUIntLE(ipwz + 1, 3));
        loc.Country = GBK_decode(Gjbut);
        ipwz = ipwz + 4;
      } else {
        const Gjbut = cmd.getStringByteArray(ipwz);
        loc.Country = GBK_decode(Gjbut);
        ipwz += Gjbut.length + 1;
      }
      loc.Area = this.readArea(ipwz, cmd);
    } else if (lx === REDIRECT_MODE_2) {
      const Gjbut = cmd.getStringByteArray(cmd.readUIntLE(ipwz + 1, 3));
      loc.Country = GBK_decode(Gjbut);
      loc.Area = this.readArea(ipwz + 4, cmd);
    } else {
      const Gjbut = cmd.getStringByteArray(ipwz);
      ipwz += Gjbut.length + 1;
      loc.Country = GBK_decode(Gjbut);
      loc.Area = this.readArea(ipwz, cmd);
    }

    return loc;
  }

  private readArea(offset: number, cmd: CmdApi): string {
    const one = cmd.readUIntLE(offset, 1);
    if (one === REDIRECT_MODE_1 || one === REDIRECT_MODE_2) {
      const areaOffset = cmd.readUIntLE(offset + 1, 3);
      if (areaOffset === 0) return unArea;
      return GBK_decode(cmd.getStringByteArray(areaOffset));
    }
    return GBK_decode(cmd.getStringByteArray(offset));
  }
}

function wrapQqwry(driver: QqwryDriverImpl): QqwryCallable {
  function callable(ip: string | number): IpInfo;
  function callable(
    begin: string | number,
    end: string | number,
  ): IpScopeInfo[];
  function callable(
    begin: string | number,
    end: string | number,
    callback: (err: Error | null, data: IpScopeInfo[]) => void,
  ): void;
  function callable(
    ip: string | number,
    end?: string | number,
    callback?: (err: Error | null, data: IpScopeInfo[]) => void,
  ): IpInfo | IpScopeInfo[] | void {
    if (arguments.length === 0) return driver.searchIP("255.255.255.255");
    if (typeof callback === "function") {
      return driver.searchIPScope(ip, end!, callback);
    }
    if (end !== undefined) return driver.searchIPScope(ip, end);
    return driver.searchIP(ip);
  }

  const fn = callable as unknown as QqwryCallable;
  fn.searchIP = driver.searchIP.bind(driver);
  fn.searchIPScope = driver.searchIPScope.bind(
    driver,
  ) as QqwryCallable["searchIPScope"];
  fn.searchIPScopeStream = driver.searchIPScopeStream.bind(driver);
  fn.speed = (() => {
    driver.speed();
    return fn;
  }) as unknown as () => QqwryCallable;
  fn.unSpeed = (() => {
    driver.unSpeed();
    return fn;
  }) as unknown as () => QqwryCallable;

  return fn;
}

/**
 * 创建 QqwryDriver 实例 (返回可调用的包装函数)
 * @param speed 开启极速模式 (或自定义IP库路径)
 * @param dataPath 自定义IP库路径
 */
function createQqwry(speed?: boolean, dataPath?: string): QqwryCallable;
function createQqwry(dataPath: string, speed?: boolean): QqwryCallable;
function createQqwry(
  speed?: boolean | string,
  dataPath?: boolean | string,
): QqwryCallable {
  const driver = new QqwryDriverImpl(speed, dataPath);
  return wrapQqwry(driver);
}

export default createQqwry;
