import { describe, expect, it } from "vitest";
import { backoff, root, safeApi } from "../extension/src/pure";

describe("extension: the site a host belongs to", () => {
  it("keeps universities under a shared country suffix apart", () => {
    expect(root("apply.ox.ac.uk")).toBe("ox.ac.uk");
    expect(root("www.cam.ac.uk")).toBe("cam.ac.uk");
    expect(root("apply.ox.ac.uk")).not.toBe(root("evil.ac.uk"));
    expect(root("apply.unsw.edu.au")).toBe("unsw.edu.au");
    expect(root("portal.unilag.edu.ng")).toBe("unilag.edu.ng");
    expect(root("pay.example.co.uk")).toBe("example.co.uk");
  });
  it("leaves ordinary hosts as they were", () => {
    expect(root("gradapply.georgetown.edu")).toBe("georgetown.edu");
    expect(root("www.mcgill.ca")).toBe("mcgill.ca");
    expect(root("apply.rotman.utoronto.ca")).toBe("utoronto.ca");
    expect(root("tum.de")).toBe("tum.de");
  });
});

describe("extension: where the browser's key may be sent", () => {
  it("only to Ivyward or the developer's own machine", () => {
    expect(safeApi("https://tryivyward.com")).toBe("https://tryivyward.com");
    expect(safeApi("https://www.tryivyward.com/x")).toBe("https://www.tryivyward.com");
    expect(safeApi("http://localhost:3000")).toBe("http://localhost:3000");
    for (const bad of ["https://tryivyward.com.evil.io", "https://evil.io/tryivyward.com", "http://tryivyward.com", "https://nottryivyward.com", "javascript:alert(1)", "", "nonsense"]) expect(safeApi(bad)).toBe("https://tryivyward.com");
  });
});

describe("extension: retrying a run that couldn't start", () => {
  it("waits longer each time, up to half an hour", () => {
    expect([1, 2, 3, 4, 5, 9].map((n) => backoff(n) / 60_000)).toEqual([1, 2, 5, 15, 15, 15]);
  });
});

import { navLevel } from "@/agents/runner";
describe("which model takes a navigation step", () => {
  it("starts small, moves up when it repeats itself, and reaches opus only when the mid model hasn't moved it", () => {
    expect(navLevel(["filled", "clicked Next"])).toBe(0);
    expect(navLevel(["a", "clicked Next", "filled", "clicked Next"])).toBe(1);
    expect(navLevel(["clicked Next", "filled", "clicked Next", "filled", "clicked Next", "filled", "clicked Next", "filled"])).toBe(2);
  });
});

import { pageKey, platformOf } from "@/lib/portal-platforms";
describe("portal systems and page keys", () => {
  it("knows the common application systems", () => {
    expect(platformOf("https://gradapply.georgetown.edu/apply/?sr=abc")).toBe("slate");
    expect(platformOf("https://eforms.manchester.ac.uk/psc/OAAPRD/EMPLOYEE/SA/c/X.GBL")).toBe("peoplesoft");
    expect(platformOf("https://gradcas.liaisoncas.com/applicant-ux/")).toBe("liaison_cas");
    expect(platformOf("https://utdallas.my.site.com/s/application")).toBe("salesforce");
    expect(platformOf("https://www.example.edu/news")).toBeNull();
  });
  it("gives the same step of a portal the same key, whoever is on it", () => {
    const a = pageKey("https://apply.school.edu/apply/form/3f2a9c1e-1111-2222-3333-444455556666/page/12?cmd=personal&x=1", "Personal Information | School");
    const b = pageKey("https://apply.school.edu/apply/form/9d8e7f6a-aaaa-bbbb-cccc-ddddeeeeffff/page/12?cmd=personal&x=2", "Personal Information | School");
    expect(a).toBe(b);
    expect(pageKey("https://apply.school.edu/apply/form/x?cmd=education", "Education")).not.toBe(a);
  });
});
