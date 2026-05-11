# AGENTS.md

## Setup

```bash
pnpm install
```

- Runtime: Node.js (CommonJS, no ESM, no build/compile step).
- The `@babel/cli` and `@babel/core` devDependencies appear unused — there is no babel build script in `package.json`. Do not add or assume a build step.

## Data file dependency

- The library reads `data/qqwry.dat` at runtime (binary IP database). Default path is resolved relative to `lib/qqwry.js`: `path.join(__dirname, "../data/qqwry.dat")`.
- `data/qqwry.ipdb` is the ipdb-format database (default path: `path.join(__dirname, "../data/qqwry.ipdb")`).
- The library will throw if the requested data file is missing or unreadable.

## Commands

| Task           | Command                           |
| -------------- | --------------------------------- |
| Install deps   | `pnpm install`                    |
| Run tests      | `node ./test/test_v.js`           |
| Run CLI        | `node ./bin/qqwry search 8.8.8.8` |
| Test ipdb      | `node ./test/test_v.js -4`        |
| Benchmark ipdb | `node ./test/test_v.js -5`        |

- **No lint, typecheck, or format commands** exist. There is no test framework (no jest/mocha). The test script (`test/test_v.js`) is a manual performance/validation script that accepts CLI args (`-1`, `-2`, `-3`, `-4`, `-5`, or an IP to query).
- The `lib/qqwry.d.ts` file is a manual type declaration. It is **not** generated and may drift from the JS source. The JS source has `// @ts-nocheck` at the top.

## Architecture

- **Entry**: `lib/qqwry.js` → exports `QqwryDriver`, a function that doubles as a constructor.
  - `const qqwry = require("lib-qqwry")()` — returns a wrapped callable: `qqwry(ip)`, `qqwry(begin, end)`, `qqwry(begin, end, callback)`.
  - Static helpers: `QqwryDriver.ipToInt()`, `.intToIP()`, `.ipEndianChange()`.
- **Two I/O modes**:
  - `fileCmd` (default): reads from disk via `fs.openSync`/`fs.readSync`. Lower memory.
  - `bufferCmd` (`.speed()`): loads entire `.dat` into a Buffer. Faster but higher memory.
  - Switching modes: `.speed()` / `.unSpeed()`.
- **Supporting modules**:
  - `lib/dataCmd.js` — `fileCmd` and `bufferCmd` factories.
  - `lib/format.js` — output formatters for stream mode (`text`, `csv`, `json`, `object`).
  - `bin/qqwry`, `bin/qqwry-search`, `bin/qqwry-find` — CLI entrypoints using `commander`.
- **Encoding**: The `.dat` file uses **GBK** encoding. Strings are decoded via `gbk.js`.
- **ipdb format**: `IpdbDriver` (via `QqwryDriver.ipdb(path, options)`) supports ipdb format using `ipip-ipdb` Reader internally. ipdb always loads into memory — `speed()`/`unSpeed()` are no-ops. Only single-IP lookup is supported (no range/stream queries). Returns objects keyed by database field names (e.g. `country_name`, `region_name`). Default query language is `"CN"`.

## Coding conventions

- Plain CommonJS: `require`/`module.exports`, no `import`/`export`.
- ES5-style: `var`, `function` declarations, no arrow functions or `const`/`let` in the library core.
- No strict linting or formatting rules. Match the existing style when editing.
