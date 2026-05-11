import { describe, it, expect } from "vitest";

// Test modules using CJS (vitest handles interop)
import libqqwry from "../src/index.js";

describe("lib-qqwry", () => {
  describe("static helpers", () => {
    it("ipToInt converts IP string to integer", () => {
      expect(libqqwry.ipToInt("0.0.0.0")).toBe(0);
      expect(libqqwry.ipToInt("255.255.255.255")).toBe(0xffffffff);
      expect(libqqwry.ipToInt("8.8.8.8")).toBe(134744072);
      expect(libqqwry.ipToInt("192.168.1.1")).toBe(3232235777);
    });

    it("ipToInt accepts numeric IP", () => {
      expect(libqqwry.ipToInt(0)).toBe(0);
      expect(libqqwry.ipToInt(134744072)).toBe(134744072);
      expect(libqqwry.ipToInt("134744072")).toBe(134744072);
    });

    it("ipToInt throws on invalid input", () => {
      expect(() => libqqwry.ipToInt("not-an-ip")).toThrow();
      expect(() => libqqwry.ipToInt("256.256.256.256")).toThrow();
      expect(() => libqqwry.ipToInt(-1)).toThrow();
      expect(() => libqqwry.ipToInt(0x100000000)).toThrow();
    });

    it("intToIP converts integer to IP string", () => {
      expect(libqqwry.intToIP(0)).toBe("0.0.0.0");
      expect(libqqwry.intToIP(0xffffffff)).toBe("255.255.255.255");
      expect(libqqwry.intToIP(134744072)).toBe("8.8.8.8");
    });

    it("intToIP throws on out-of-range values", () => {
      expect(() => libqqwry.intToIP(-1)).toThrow();
      expect(() => libqqwry.intToIP(0x100000000)).toThrow();
    });

    it("ipEndianChange swaps endianness", () => {
      const orig = libqqwry.ipToInt("1.0.0.255");
      const swapped = libqqwry.ipEndianChange(orig);
      expect(swapped).toBe(0xff000001);
      // double swap returns original
      expect(libqqwry.ipEndianChange(swapped)).toBe(orig);
    });

    it("round-trip: ipToInt <-> intToIP", () => {
      const ips = ["0.0.0.0", "255.255.255.255", "127.0.0.1", "8.8.8.8"];
      for (const ip of ips) {
        expect(libqqwry.intToIP(libqqwry.ipToInt(ip))).toBe(ip);
      }
    });
  });

  describe("init", () => {
    it("init() creates a callable instance", () => {
      const q = libqqwry.init();
      expect(typeof q).toBe("function");
      expect(typeof q.searchIP).toBe("function");
    });

    it("init(true) enables speed mode", () => {
      const q = libqqwry.init(true);
      expect(typeof q).toBe("function");
    });

    it("init(customPath) uses custom dat path", () => {
      const q = libqqwry.init("./data/qqwry.dat");
      expect(typeof q).toBe("function");
      expect(typeof q.searchIP).toBe("function");
    });
  });

  describe("default export (callable constructor)", () => {
    it("libqqwry() returns a callable function", () => {
      const q = libqqwry();
      expect(typeof q).toBe("function");
    });

    it("callable with no args returns special IP info", () => {
      const q = libqqwry();
      const result = q();
      expect(result).toBeDefined();
      expect(result.Country).toBeDefined();
      expect(result.Area).toBeDefined();
    });
  });

  describe("searchIP", () => {
    const q = libqqwry();

    it("returns IP info for 8.8.8.8", () => {
      const result = q.searchIP("8.8.8.8");
      expect(result.int).toBe(134744072);
      expect(result.ip).toBe("8.8.8.8");
      expect(result.Country).toBeTruthy();
      expect(result.Area).toBeTruthy();
    });

    it("returns IP info for 0.0.0.0", () => {
      const result = q.searchIP("0.0.0.0");
      expect(result.int).toBe(0);
      expect(result.ip).toBe("0.0.0.0");
    });

    it("returns IP info for 255.255.255.255", () => {
      const result = q.searchIP("255.255.255.255");
      expect(result.int).toBe(0xffffffff);
      expect(result.ip).toBe("255.255.255.255");
    });

    it("returns IP info for numeric IP", () => {
      const result = q.searchIP(134744072);
      expect(result.ip).toBe("8.8.8.8");
    });

    it("callable with single arg delegates to searchIP", () => {
      const result = q("8.8.8.8");
      expect(result.int).toBe(134744072);
      expect(result.ip).toBe("8.8.8.8");
    });
  });

  describe("searchIPScope", () => {
    const q = libqqwry();

    it("returns IP range info", () => {
      const results = q.searchIPScope("8.8.8.0", "8.8.8.8");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const first = results[0];
      expect(first.begInt).toBeGreaterThan(0);
      expect(first.endInt).toBeGreaterThanOrEqual(first.begInt);
      expect(first.begIP).toBeTruthy();
      expect(first.endIP).toBeTruthy();
      expect(first.Country).toBeTruthy();
    });

    it("callable with two args delegates to searchIPScope", () => {
      const results = q("8.8.8.0", "8.8.8.8");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("searchIPScope async", () => {
    it("supports async callback pattern", async () => {
      const q = libqqwry();
      const data = await new Promise((resolve, reject) => {
        q.searchIPScope("8.8.8.0", "8.8.8.8", (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeGreaterThan(0);
    });

    it("callable with callback delegates to async searchIPScope", async () => {
      const q = libqqwry();
      const data = await new Promise((resolve, reject) => {
        q("8.8.8.0", "8.8.8.8", (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("searchIPScopeStream", () => {
    it("streams data in text mode", async () => {
      const q = libqqwry();
      const stream = q.searchIPScopeStream("8.8.8.8", "8.8.8.8");

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(String(chunk));
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("streams data in csv mode", async () => {
      const q = libqqwry();
      const stream = q.searchIPScopeStream("8.8.8.8", "8.8.8.8", {
        format: "csv",
      });

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(String(chunk));
      }
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toMatch(/^\d+/); // starts with number
    });

    it("streams data in csv mode with header", async () => {
      const q = libqqwry();
      const stream = q.searchIPScopeStream("8.8.8.8", "8.8.8.8", {
        format: "csv",
        outHeader: true,
      });

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(String(chunk));
      }
      expect(chunks[0]).toContain("begInt");
    });

    it("streams data in json mode", async () => {
      const q = libqqwry();
      const stream = q.searchIPScopeStream("8.8.8.8", "8.8.8.8", {
        format: "json",
        outHeader: true,
      });

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(String(chunk));
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("streams data in object mode", async () => {
      const q = libqqwry();
      const stream = q.searchIPScopeStream("8.8.8.8", "8.8.8.8", {
        format: "object",
      });

      const chunks: unknown[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
      expect(Array.isArray(chunks[0])).toBe(true);
    });
  });

  describe("speed / unSpeed", () => {
    it("speed() enables speed mode (chaining)", () => {
      const q = libqqwry();
      const result = q.speed();
      expect(result).toBe(q);

      // Still works after speeding
      const info = q("8.8.8.8");
      expect(info.ip).toBe("8.8.8.8");
    });

    it("unSpeed() disables speed mode (chaining)", () => {
      const q = libqqwry(true); // start with speed
      const result = q.unSpeed();
      expect(result).toBe(q);

      const info = q("8.8.8.8");
      expect(info.ip).toBe("8.8.8.8");
    });
  });

  describe("ipdb driver", () => {
    it("creates ipdb driver", () => {
      const ipdb = libqqwry.ipdb();
      expect(typeof ipdb).toBe("function");
    });

    it("returns fields", () => {
      const ipdb = libqqwry.ipdb();
      const fields = ipdb.fields();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain("country_name");
      expect(fields).toContain("region_name");
    });

    it("returns languages", () => {
      const ipdb = libqqwry.ipdb();
      const langs = ipdb.languages();
      expect(langs).toContain("CN");
    });

    it("returns build time", () => {
      const ipdb = libqqwry.ipdb();
      const bt = ipdb.buildTime();
      expect(typeof bt).toBe("number");
      expect(bt).toBeGreaterThan(0);
    });

    it("looks up IP", () => {
      const ipdb = libqqwry.ipdb();
      const result = ipdb("8.8.8.8");
      expect(result.ip).toBe("8.8.8.8");
      expect(result.country_name).toBeTruthy();
    });

    it("looks up IP with numeric input", () => {
      const ipdb = libqqwry.ipdb();
      const result = ipdb(134744072);
      expect(result.ip).toBe("8.8.8.8");
    });

    it("speed/unSpeed are no-ops", () => {
      const ipdb = libqqwry.ipdb();
      expect(ipdb.speed()).toBe(ipdb);
      expect(ipdb.unSpeed()).toBe(ipdb);
    });

    it("ipdb with no args returns version info", () => {
      const ipdb = libqqwry.ipdb();
      const result = ipdb();
      expect(result.ip).toBeTruthy();
    });

    it("callable with two args passes language", () => {
      const ipdb = libqqwry.ipdb();
      const result = ipdb("8.8.8.8", "CN");
      expect(result.ip).toBe("8.8.8.8");
    });
  });
});
