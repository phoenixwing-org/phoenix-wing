// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ktCodegenDefineTableElement } from "../src/table/KtCodegenTable.js";
import { ktCodegenDefineControlPanelElement } from "../src/ui/KtCodegenControlPanel.js";
import { KT_CODEGEN_BLOCK_HEADER_STYLE } from "../src/ui/KtCodegenBlockHeader.js";

beforeAll(() => { ktCodegenDefineTableElement(); ktCodegenDefineControlPanelElement(); });
afterEach(() => document.body.replaceChildren());

describe.each([
  ["kt-codegen-table", "参数表", "kt-codegen-table-collapse-change"],
  ["kt-codegen-control-panel", "预检结果", "kt-codegen-control-collapse-change"],
])("%s shared Block header", (tag, title, eventName) => {
  it("shares typography, disclosure geometry and style without taking body scrolling", () => {
    const view = document.createElement(tag);
    view.setAttribute("collapsible", "");
    document.body.append(view);
    const root = view.shadowRoot!;
    expect(root.querySelector("style")!.textContent).toContain(KT_CODEGEN_BLOCK_HEADER_STYLE);
    const toggle = root.querySelector<HTMLButtonElement>("[data-codegen-block-toggle]")!;
    expect(toggle.type).toBe("button");
    expect(toggle.querySelector("[data-codegen-block-title]")!.textContent).toBe(title);
    expect(toggle.querySelector("[data-codegen-block-indicator]")!.textContent).toBe("›");
    expect(toggle.querySelector("[data-codegen-block-indicator]")!.getAttribute("aria-hidden")).toBe("true");
    expect(KT_CODEGEN_BLOCK_HEADER_STYLE).not.toContain("overflow-y");
    expect(KT_CODEGEN_BLOCK_HEADER_STYLE).not.toContain("position: sticky");
  });

  it("title, whitespace and arrow each toggle once; action buttons never toggle", () => {
    const view = document.createElement(tag);
    view.setAttribute("collapsible", "");
    document.body.append(view);
    const events: boolean[] = [];
    view.addEventListener(eventName, (event) => events.push((event as CustomEvent).detail.collapsed));
    const click = (selector: string) => view.shadowRoot!.querySelector<HTMLElement>(selector)!.click();
    click("[data-codegen-block-title]");
    click("[data-codegen-block-header]");
    click("[data-codegen-block-indicator]");
    expect(events).toEqual([true, false, true]);
    expect(view.shadowRoot!.querySelector("[data-codegen-block-toggle]")!.getAttribute("aria-expanded")).toBe("false");
    view.shadowRoot!.querySelector<HTMLButtonElement>(tag === "kt-codegen-table"
      ? "button[data-action=autoFit]" : ".pnw-codegen-filter")!.click();
    expect(events).toEqual([true, false, true]);
    expect(view.hasAttribute("collapsed")).toBe(true);
  });
});
