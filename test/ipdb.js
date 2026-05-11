const ipdb = require("ipip-ipdb");

var city = new ipdb.City(
  "D:\\code\\FrontendProject\\Project\\lib-qqwry\\data\\qqwry.ipdb"
);
info = city.findInfo("111.31.58.71", "CN");
console.log(info);
