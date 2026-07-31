import { ref } from "vue";
import { describe, expect, it } from "vitest";
import {
  pnwCreateViewContributionRegistration,
  pnwCreateViewContributionRegistry,
} from "./usePnwViewContribution.js";

describe("Pnw View contribution registry", () => {
  it("按 View ID 登记并在切换、停用时释放当前 owner", () => {
    const registry = pnwCreateViewContributionRegistry<{ label: string }>();
    const viewId = ref<string | undefined>("dashboard");
    const contribution = { label: "Dashboard Blocks" };
    const registration = pnwCreateViewContributionRegistration(
      registry,
      viewId,
      contribution,
    );

    registration.activate();
    expect(registry.get("dashboard")).toBe(contribution);

    viewId.value = "models";
    registration.sync();
    expect(registry.get("dashboard")).toBeUndefined();
    expect(registry.get("models")).toBe(contribution);

    expect(registry.delete("models", { label: "other owner" })).toBe(false);
    expect(registry.get("models")).toBe(contribution);

    registration.deactivate();
    expect(registry.get("models")).toBeUndefined();
  });

  it("空 ID 不注册，dispose 可重复调用", () => {
    const registry = pnwCreateViewContributionRegistry<object>();
    const registration = pnwCreateViewContributionRegistration(registry, "", {});
    registration.activate();
    expect(registry.get("")).toBeUndefined();
    registration.dispose();
    registration.dispose();
  });
});
