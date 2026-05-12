import ipdbCmd from "./ipdb-cmd";
import { intToIP, attachSpeedUnSpeed } from "./driver";
import type { IpdbCmdFactory, IpdbCallable } from "./types";

class IpdbDriverImpl {
  readonly dataPath: string;
  readonly language: string;
  private cmdFactory: IpdbCmdFactory;

  constructor(dataPath: string, options?: { language?: string }) {
    const opts = options || {};
    this.dataPath = dataPath;
    this.language = opts.language || "CN";
    this.cmdFactory = ipdbCmd(this.dataPath);
  }

  searchIP(ip: string | number, language?: string): Record<string, string> {
    const lang = language || this.language;
    const cmd = this.cmdFactory();
    const addr = typeof ip === "number" ? intToIP(ip) : ip;
    const data = cmd.find(addr, lang);
    const fieldList = cmd.fields();
    const result: Record<string, string> = { ip: addr };

    if (data && data.length) {
      for (let i = 0; i < fieldList.length; i++) {
        result[fieldList[i]] = data[i] || "";
      }
    }

    return result;
  }

  fields(): string[] {
    return this.cmdFactory().fields();
  }

  languages(): string[] {
    return this.cmdFactory().languages();
  }

  buildTime(): number {
    return this.cmdFactory().buildTime();
  }

  speed(): this {
    return this;
  }

  unSpeed(): this {
    return this;
  }
}

function wrapIpdb(driver: IpdbDriverImpl): IpdbCallable {
  function callable(
    ip?: string | number,
    language?: string,
  ): Record<string, string> {
    if (arguments.length === 0) return driver.searchIP("255.255.255.255");
    return driver.searchIP(ip!, language);
  }

  const fn = callable as unknown as IpdbCallable;
  fn.searchIP = driver.searchIP.bind(driver);
  fn.fields = driver.fields.bind(driver);
  fn.languages = driver.languages.bind(driver);
  fn.buildTime = driver.buildTime.bind(driver);
  attachSpeedUnSpeed(fn, driver);

  return fn;
}

/**
 * 创建 IpdbDriver 实例 (返回可调用的包装函数)
 * @param dataPath ipdb文件路径
 * @param options 选项
 */
export function createIpdb(
  dataPath: string,
  options?: { language?: string },
): IpdbCallable {
  const driver = new IpdbDriverImpl(dataPath, options);
  return wrapIpdb(driver);
}
