import { describe, expect, it, vi } from "vitest";
import { pnwCreateOutputBuffer } from "./pnwOutput.js";

describe("pnwCreateOutputBuffer", () => {
  it("按 append / appendLine / replace / clear 信号维护自由文本", () => {
    const output = pnwCreateOutputBuffer();
    const listener = vi.fn();
    output.subscribe(listener);

    output.dispatch({ type: "append", value: "Phoenix" });
    output.dispatch({ type: "appendLine", value: " Admin" });
    output.dispatch({ type: "appendLine", value: "ready" });
    expect(output.getSnapshot()).toEqual({
      text: "Phoenix Admin\nready\n",
      revision: 3,
    });

    output.dispatch({ type: "replace", value: "replaced\n" });
    expect(output.getSnapshot().text).toBe("replaced\n");
    output.dispatch({ type: "clear" });
    expect(output.getSnapshot().text).toBe("");
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it("按实例限制字符数且不会创建跨实例状态", () => {
    const first = pnwCreateOutputBuffer({ maxCharacters: 5 });
    const second = pnwCreateOutputBuffer();

    first.dispatch({ type: "append", value: "1234567" });

    expect(first.getSnapshot().text).toBe("34567");
    expect(second.getSnapshot().text).toBe("");
  });
});
