import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import libqqwry from "./index.js";
import { ipToInt } from "./driver.js";
import getFormatFn from "./format.js";

const program = new Command();

program
  .name("qqwry")
  .description("<command> [options]")
  .option("-v, --version-custom", "当前版本信息")
  .addHelpText(
    "after",
    "\nCommands:\n  search [default]  搜索IP/IP段\n  find              查找区域信息",
  );

program.on("option:version-custom", () => {
  try {
    const qqwry = libqqwry();
    const v_data = qqwry.searchIP("255.255.255.255").Area;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require("../package.json");
    console.log(`v${pkg.version}`, `(Local data: ${chalk.bold(v_data)})`);
  } catch (err: unknown) {
    console.error((err as Error).message || err);
  }
  process.exit(0);
});

// ---- search command (default) ----
program
  .command("search", { isDefault: true })
  .description("搜索IP/IP段")
  .argument("<ip>", "IP地址或起始IP")
  .argument("[ips...]", "更多IP地址或结束IP")
  .option("-r, --range", "IP段模式查询")
  .option(
    "-f, --format <value>",
    '让IP段模式输出的特定格式 支持 "json" or "csv"',
    /^(json|csv)$/,
  )
  .option("-o, --output <path>", "输出至文件")
  .option("-H, --no-header", "csv 与 json 格式不输出字段名")
  .option(
    "-S, --no-speed",
    "IP段查询模式时默认会启动speed模式, 添加此选项可关闭该设定",
  )
  .addHelpText(
    "after",
    "\nExamples:\n  $ qqwry 1.0.0.0\n  $ qqwry 0.0.0.0 1.0.0.0 -rf csv",
  )
  .action((ip: string, ips: string[], options: Record<string, unknown>) => {
    const { range, format, speed, header, output } = options as {
      range?: boolean;
      format?: string;
      speed?: boolean;
      header?: boolean;
      output?: string;
    };

    try {
      const lib = libqqwry();
      const allIps = [ip, ...ips];
      let stdout: NodeJS.WritableStream = process.stdout;

      if (output) {
        const ext = path.parse(output).ext;
        const resolvedFormat = format
          ? format
          : ext === ".json"
            ? "json"
            : ext === ".csv"
              ? "csv"
              : format;
        stdout = fs.createWriteStream(output);
        stdout.on("error", (err: Error) => {
          console.error(err.message || err);
        });
        stdout.on("close", () => {
          console.log("done");
        });
        (options as Record<string, unknown>).format = resolvedFormat;
      }

      if (range) {
        const ns = allIps.map(ipToInt);
        const min = Math.min(...ns);
        const max = Math.max(...ns);
        if (speed !== undefined && speed) lib.speed();
        lib
          .searchIPScopeStream(min, max, {
            format: format as "json" | "csv" | "text" | "object" | undefined,
            outHeader: header,
          })
          .pipe(stdout);
      } else if (allIps.length > 1) {
        for (const addr of allIps) {
          const v = lib(addr);
          console.log(`${v.ip} ${v.Country} ${v.Area}`);
        }
      } else {
        const v = lib(allIps[0]);
        console.log(`${v.Country} ${v.Area}`);
      }
    } catch (err: unknown) {
      console.error((err as Error).message || err);
    }
  });

// ---- find command ----
program
  .command("find")
  .description("通过关键字反查IP段")
  .argument("<keyword>", "关键字")
  .argument("[keywords...]", "更多关键字")
  .option("-c, --count", "只是统计记录数")
  .option("--have <value>", "过滤关键字")
  .option("-i, --ignore-case", "不区分大小写模式")
  .option("-E, --extended-regexp", "启用正则表达式查询")
  .action(
    (
      keyword: string,
      keywords: string[],
      options: {
        ignoreCase?: boolean;
        count?: boolean;
        have?: string;
        extendedRegexp?: boolean;
      },
    ) => {
      const { ignoreCase, count, have: filter, extendedRegexp } = options;

      try {
        const lib = libqqwry();
        let allKeywords = [keyword, ...keywords];
        const stdout = process.stdout;
        lib.speed();
        let sum = 0;
        const formatFn = getFormatFn("text");

        const isMatch = (() => {
          if (extendedRegexp) {
            const patterns = allKeywords.map((k) => {
              const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              return `(${escaped})`;
            });
            const reg = new RegExp(patterns.join("|"), ignoreCase ? "i" : "");
            return (str: string) => reg.test(str);
          }

          if (ignoreCase) {
            allKeywords = allKeywords.map((v) => v.toLocaleLowerCase());
            return (str: string) => {
              const lower = str.toLocaleLowerCase();
              for (const key of allKeywords) {
                if (lower.indexOf(key) !== -1) return true;
              }
              return false;
            };
          }

          return (str: string) => {
            for (const key of allKeywords) {
              if (str.indexOf(key) !== -1) return true;
            }
            return false;
          };
        })();

        const Filter = (() => {
          if (filter) {
            if (ignoreCase) {
              const f = filter.toLocaleLowerCase();
              return (str: string) => str.toLocaleLowerCase().indexOf(f) !== -1;
            }
            return (str: string) => str.indexOf(filter) !== -1;
          }
          return null;
        })();

        lib
          .searchIPScopeStream(0, 0xffffffff, { format: "object" })
          .on("data", (obj: (string | number)[]) => {
            if (
              isMatch(String(obj[4])) ||
              (isMatch(String(obj[5])) &&
                (!Filter || Filter(String(obj[4])) || Filter(String(obj[5]))))
            ) {
              sum++;
              if (!count) {
                stdout.write(formatFn(obj));
              }
            }
          })
          .on("end", () => {
            if (count) console.log(sum);
          });
      } catch (err: unknown) {
        console.error((err as Error).message || err);
      }
    },
  );

program.parse();
