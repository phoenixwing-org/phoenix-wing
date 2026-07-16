import { describe, expect, it } from "vitest";
import { pnwNormalizeUuid as fromLegacySubpath } from "./index.js";
import { pnwNormalizeUuid as fromSmallPackage } from "@phoenix-wing/code-core";

describe("phoenix-wing/code-core compatibility subpath", () => {
  it("re-exports the independent code-core package without another implementation", () => {
    const value = "{550E8400-E29B-41D4-A716-446655440000}";
    expect(fromLegacySubpath(value)).toBe(fromSmallPackage(value));
  });
});
