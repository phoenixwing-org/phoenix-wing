// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { PNW_CONTENT_BLOCK_TAG, PNW_CONTENT_BLOCK_TOGGLE, pnwCreateContentBlockClass } from "../model.js";

describe("PnwContentBlock Node-safe model entry", () => {
  it("exports the factory without evaluating HTMLElement or registering browser elements", () => {
    expect(typeof globalThis.HTMLElement).toBe("undefined");
    expect(PNW_CONTENT_BLOCK_TAG).toBe("pnw-content-block"); expect(PNW_CONTENT_BLOCK_TOGGLE).toBe("pnw-content-block-toggle");
    expect(typeof pnwCreateContentBlockClass).toBe("function");
    expect(pnwCreateContentBlockClass.toString()).not.toMatch(/\b(?:import|require|postMessage|acquireVsCodeApi|localStorage|sessionStorage)\b/u);
  });
});
