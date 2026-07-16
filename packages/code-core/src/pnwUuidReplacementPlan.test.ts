import { describe, expect, it } from "vitest";
import { pnwApplyUuidReplacementPlan, pnwPlanUuidReplacements } from "./pnwUuidReplacementPlan.js";

const oldValue = "12345678-1234-1234-1234-1234567890ab";
const first = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const second = "11111111-2222-4333-8444-555555555555";

describe("pnw UUID replacement plan", () => {
  it("maps the same normalized value across files and preserves each source format", () => {
    const caa = "{0x12345678, 0x1234, 0x1234, 0x12, 0x34, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab}";
    const plan = pnwPlanUuidReplacements(
      [{ id: "a.cpp", text: `${oldValue}\n${oldValue.toUpperCase()}` }, { id: "b.cpp", text: caa }],
      { createUuid: () => first },
    );
    expect(plan).toMatchObject({ valid: true, strategy: "map_per_value" });
    expect(plan.groups).toHaveLength(1);
    expect(plan.hits).toHaveLength(3);
    expect(plan.groups[0]?.to).toBe(first);
    const applied = pnwApplyUuidReplacementPlan(caa, "b.cpp", plan);
    expect(applied.text).toContain("{0xaaaaaaaa, 0xbbbb, 0x4ccc, 0x8d, 0xdd, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee}");
  });

  it("creates a distinct target for each selected hit in fresh-per-hit mode", () => {
    const values = [first, second];
    const plan = pnwPlanUuidReplacements([{ id: "a.cpp", text: `${oldValue}\n${oldValue}` }], {
      strategy: "fresh_per_hit",
      createUuid: () => values.shift() ?? second,
    });
    expect(plan.groups).toHaveLength(2);
    expect(plan.hits.map((hit) => hit.to)).toEqual([first, second]);
    const onlyFirst = pnwApplyUuidReplacementPlan(`${oldValue}\n${oldValue}`, "a.cpp", plan, new Set([plan.hits[0]!.id]));
    expect(onlyFirst.text).toBe(`${first}\n${oldValue}`);
  });

  it("reports stale offsets instead of changing a different token", () => {
    const plan = pnwPlanUuidReplacements([{ id: "a.cpp", text: oldValue }], { createUuid: () => first });
    const stale = pnwApplyUuidReplacementPlan(`x${oldValue}`, "a.cpp", plan);
    expect(stale.text).toBe(`x${oldValue}`);
    expect(stale.skippedHitIds).toEqual([plan.hits[0]?.id]);
  });
});
