import { describe, expect, it } from "vitest";
import { pnwResolveCaaEnvironment } from "./pnwCaaEnvironment.js";

describe("pnw CAA environment", () => {
  it("uses workspace overrides before inherited system values without mutating either", () => {
    const environment = pnwResolveCaaEnvironment({ ROOT_DIR: "/system/custom", ROOT_DIR_3rdParty: "/third", ROOT_DIR_CORE: "/core", CAA_MK_VERSION: "18" }, { customRoot: "/workspace/custom", caaMkVersion: "19" });
    expect(environment.complete).toBe(true);
    expect(environment.values).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "customRoot", value: "/workspace/custom", source: "workspace" }),
      expect.objectContaining({ key: "thirdPartyRoot", value: "/third", source: "system" }),
      expect.objectContaining({ key: "caaMkVersion", value: "19", source: "workspace" }),
    ]));
  });
  it("marks missing required roots and suggests the CAA MK version", () => {
    const environment = pnwResolveCaaEnvironment({});
    expect(environment.complete).toBe(false);
    expect(environment.values).toContainEqual(expect.objectContaining({ key: "caaMkVersion", source: "missing", suggestedValue: "19" }));
  });
});
