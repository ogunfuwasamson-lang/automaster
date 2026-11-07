import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";
import { isPrivateIp, obviouslyUnsafe, isPublicUrl } from "@/lib/net-guard";

describe("sign-in redirect stays on this site", () => {
  it("keeps real paths", () => {
    expect(safeNextPath("/applications/abc?pay=1")).toBe("/applications/abc?pay=1");
  });
  it("refuses other sites in every spelling a browser accepts", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "/\\\\evil.com", "https://evil.com", "evil.com", "/ /evil.com", "javascript:alert(1)", ""]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
      expect(new URL(safeNextPath(bad), "https://tryivyward.com").host).toBe("tryivyward.com");
    }
  });
});

describe("the server and its browsers never reach the private network", () => {
  it("knows private, loopback and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.2.3.4", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) expect(isPrivateIp(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "1.1.1.1", "2606:4700::1111"]) expect(isPrivateIp(ip)).toBe(false);
  });
  it("refuses unsafe URLs before any request", () => {
    for (const u of ["http://localhost:3001/api/worker", "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://[::1]/", "file:///etc/passwd", "ftp://x.com", "http://metadata.google.internal/", "http://printer.local/", "not a url"]) expect(obviouslyUnsafe(u)).toBe(true);
    expect(obviouslyUnsafe("https://www.ox.ac.uk/admissions")).toBe(false);
  });
  it("refuses names that resolve to this machine", async () => {
    expect(await isPublicUrl("http://localhost./")).toBe(false);
    expect(await isPublicUrl("http://127.0.0.1.nip.io/")).toBe(false); // resolves to 127.0.0.1, or fails: either way refused
  });
});
