# lib-qqwry

> [!TIP]
> 本项目基于 [cnwhy/lib-qqwry](https://github.com/cnwhy/lib-qqwry) 二次开发，感谢原作者 [@cnwhy](https://github.com/cnwhy) 的优秀工作。

`lib-qqwry` 是一个高效的纯真IP库查询引擎，支持 `qqwry.dat` 和 `qqwry.ipdb` 两种数据格式。

相比原作，本项目主要改动：

- **TypeScript 重写**，提供完整类型定义
- **支持 ESM + CJS 双模**输出
- **新增 ipdb 格式支持**（`libqqwry.ipdb()`）
- **现代化构建工具链** (tsup + vitest)

## 安装

```
npm i lib-qqwry-next
```

## 数据文件

使用本库前需要自行准备数据文件：

- [纯真IP库 (qqwry.dat)](https://github.com/nmgliangwei/qqwry)
- [ipip.net ipdb 格式](https://github.com/nmgliangwei/qqwry.ipdb)

## 使用

### Node (CJS)

```js
const libqqwry = require("lib-qqwry-next");
const qqwry = libqqwry("./data/qqwry.dat"); // dataPath 必填
qqwry.speed(); // 启用急速模式

const result = qqwry.searchIP("202.103.102.10"); // 查询IP信息
const ips = qqwry.searchIPScope("0.0.0.0", "1.0.0.0"); // 查询IP段信息

// 异步查询IP段信息
qqwry.searchIPScope("0.0.0.0", "1.0.0.0", (err, iparr) => {
  console.log(iparr);
});

// 流模式返回IP段结果
qqwry
  .searchIPScopeStream("0.0.0.0", "1.0.0.0", { format: "json" })
  .pipe(process.stdout);
```

### Node (ESM)

```js
import libqqwry from "lib-qqwry-next";
const qqwry = libqqwry("./data/qqwry.dat", true); // dataPath, speed
const result = qqwry.searchIP("202.103.102.10");
```

### ipdb 格式

```js
import libqqwry from "lib-qqwry-next";

const ipdb = libqqwry.ipdb("./data/qqwry.ipdb"); // dataPath 必填
const result = ipdb.searchIP("8.8.8.8");
// { ip: '8.8.8.8', country_name: '美国', region_name: '加利福尼亚州圣克拉拉县山景市谷歌公司' }
```

## API

### libqqwry.ipToInt(ip)

IP地址转数值：

```
> libqqwry.ipToInt("255.255.255.255")
4294967295
```

### libqqwry.intToIP(int)

数值转IP地址：

```
> libqqwry.intToIP(4294967295)
'255.255.255.255'
```

### libqqwry.ipEndianChange(int)

字节序转换（32位），用于处理 Little-Endian 形式的IP数值：

```
> libqqwry.ipEndianChange(0x010000FF)
4278190081 // 0xFF000001
```

### libqqwry(dataPath, speed?) / libqqwry.init(dataPath, speed?)

实例化一个 qqwry.dat 格式解析器（`libqqwry.init()` 是其等价别名）：

- `dataPath`: IP库路径，**必填**
- `speed`: 是否开启急速模式（将数据文件读入内存），可选，默认 `false`

```js
const qqwry = libqqwry("./data/qqwry.dat");
// 或
const qqwry = libqqwry("./data/qqwry.dat", true); // 急速模式
```

### libqqwry.ipdb(dataPath, options?)

实例化 ipdb 格式解析器：

- `dataPath`: ipdb 文件路径，**必填**
- `options.language`: 查询语言，可选，默认 `"CN"`

```js
const ipdb = libqqwry.ipdb("./data/qqwry.ipdb", { language: "CN" });
```

## Ipdb 解析器

### ipdb.searchIP(ip [, language])

单个IP查询，也可直接调用：`ipdb(ip)` 或 `ipdb(ip, language)`

```
> ipdb("8.8.8.8")
{ ip: '8.8.8.8',
  country_name: '美国',
  region_name: '加利福尼亚州圣克拉拉县山景市谷歌公司' }
```

### ipdb.fields()

返回 ipdb 文件中定义的字段列表：

```
> ipdb.fields()
[ 'country_name', 'region_name', 'city_name', 'isp_domain' ]
```

### ipdb.languages()

返回 ipdb 文件中支持的语言列表：

```
> ipdb.languages()
[ 'CN', 'EN' ]
```

### ipdb.buildTime()

返回 ipdb 文件的构建时间（Unix 时间戳，单位：秒）：

```
> ipdb.buildTime()
1714003200
```

### ipdb.speed() / ipdb.unSpeed()

ipdb 格式始终将数据加载到内存中，这两个方法为兼容接口，实际无操作。

## Qqwry 解析器

### qqwry.searchIP(ip)

单个IP查询，也可直接调用：`qqwry(ip)`

```
> qqwry("255.255.255.255")
{ int: 4294967295,
  ip: '255.255.255.255',
  Country: '纯真网络',
  Area: '2017年1月5日IP数据' }
```

### qqwry.searchIPScope(beginIP, endIP [, callback])

IP段查询，也可直接调用：`qqwry(beginIP, endIP, callback)`

```
> qqwry("8.8.8.0", "8.8.8.8")
[ { begInt: 134744064,
    endInt: 134744071,
    begIP: '8.8.8.0',
    endIP: '8.8.8.7',
    Country: '美国',
    Area: '加利福尼亚州圣克拉拉县山景市谷歌公司' },
  { begInt: 134744072,
    endInt: 134744072,
    begIP: '8.8.8.8',
    endIP: '8.8.8.8',
    Country: '美国',
    Area: '加利福尼亚州圣克拉拉县山景市谷歌公司DNS服务器' } ]
```

### qqwry.searchIPScopeStream(beginIP, endIP, options)

流模式返回IP段结果，适合数据量较大的场景：

- `format`: 输出格式，支持 `'text'`、`'csv'`、`'json'`、`'object'`
- `outHeader`: 为 `true` 时，csv 输出表头，json 以对象数组形式输出；默认 `false`

```js
// 文本格式
qqwry.searchIPScopeStream("8.8.8.0", "8.8.8.8").pipe(process.stdout);

// CSV格式
qqwry
  .searchIPScopeStream("8.8.8.0", "8.8.8.8", { format: "csv" })
  .pipe(process.stdout);

// JSON格式
qqwry
  .searchIPScopeStream("8.8.8.0", "8.8.8.8", { format: "json" })
  .pipe(process.stdout);
```

### qqwry.speed()

启用急速模式（将IP库文件读入内存以提升查询效率）。

### qqwry.unSpeed()

停用急速模式（切换回文件直接读取模式）。

## License

BSD — 继承自原作 [cnwhy/lib-qqwry](https://github.com/cnwhy/lib-qqwry)
