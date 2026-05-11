import { bench, describe } from "vitest";
import libqqwry from "../src/index.js";

const qqwry = libqqwry(true); // speed mode
const ips: string[] = [];

// Generate 100 random IPs
for (let i = 0; i < 100; i++) {
  ips.push(libqqwry.intToIP((Math.random() * 0xffffffff) >>> 0));
}

describe("searchIP benchmark", () => {
  bench("single IP lookup x100 (speed mode)", () => {
    for (const ip of ips) {
      qqwry(ip);
    }
  });
});

describe("searchIPScope benchmark", () => {
  bench("small range lookup x5", () => {
    for (let i = 0; i < 5; i++) {
      const ip1 = ips[i * 2];
      const ip2 = ips[i * 2 + 1];
      const min = libqqwry.ipToInt(ip1);
      const max = libqqwry.ipToInt(ip2);
      qqwry(Math.min(min, max), Math.max(min, max));
    }
  });
});

const ipdb = libqqwry.ipdb();
describe("ipdb benchmark", () => {
  bench("single IP lookup x100 (ipdb)", () => {
    for (const ip of ips) {
      ipdb(ip);
    }
  });
});
