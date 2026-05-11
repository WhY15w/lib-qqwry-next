var Reader = require("ipip-ipdb/lib/reader");

/**
 * 对ipdb格式数据的操作类
 * @param {string} dataPath ipdb文件路径
 */
function ipdbCmd(dataPath) {
  var reader = new Reader(dataPath);

  var api = {
    name: "ipdbCmd",
    find: function (addr, language) {
      return reader.find(addr, language);
    },
    fields: function () {
      return reader.fields();
    },
    languages: function () {
      return reader.languages();
    },
    buildTime: function () {
      return reader.buildTime();
    },
    close: function () {},
  };

  return function ipdbCmd() {
    return api;
  };
}

module.exports = ipdbCmd;
