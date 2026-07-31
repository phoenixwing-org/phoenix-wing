import { describe, expect, it } from "vitest";
import {
  PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES,
  PWW_FIXTURE_NAVIGATION_LAYOUT_KEY,
  PWW_FIXTURE_WORKBENCH_PREFERENCES_KEY,
  pwwReadFixtureNavigationLayoutPreference,
  pwwReadFixtureWorkbenchPreferences,
  pwwWriteFixtureNavigationLayoutPreference,
  pwwWriteFixtureWorkbenchPreferences,
} from "./PwwFixtureWorkbenchPreferences.js";
import { PWW_FIXTURE_NAVIGATION } from "./PwwFixtureNavigation.js";
import {
  pwwCreateExampleNavigationLayoutPreference,
  pwwMoveExampleNavigationNode,
} from "./PwwFixtureNavigationLayout.js";

function pwwFixtureMemoryStorage(
  initial?: string,
  key = PWW_FIXTURE_WORKBENCH_PREFERENCES_KEY,
) {
  const entries = new Map<string, string>();
  if (initial !== undefined) {
    entries.set(key, initial);
  }
  return {
    getItem(key: string): string | null {
      return entries.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      entries.set(key, value);
    },
  };
}

describe("Pww fixture 工作台显示偏好", () => {
  it("损坏或过期快照回到 fixture 默认值", () => {
    expect(pwwReadFixtureWorkbenchPreferences(
      pwwFixtureMemoryStorage("not-json"),
    ).display).toEqual(PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES);

    const expired = pwwFixtureMemoryStorage(JSON.stringify({
      version: 0,
      display: { presentation: "tree" },
      customTheme: true,
    }));
    expect(pwwReadFixtureWorkbenchPreferences(expired)).toEqual({
      version: 1,
      display: PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES,
      customTheme: false,
    });
  });

  it("写入前统一归一化并可在刷新后读回", () => {
    const storage = pwwFixtureMemoryStorage();
    pwwWriteFixtureWorkbenchPreferences({
      version: 1,
      display: {
        ...PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES,
        presentation: "tree",
        colorScheme: "dark",
        tabBarPlacement: "editor-bottom",
        settingsPositions: {
          quick: { x: 150, y: 86 },
          full: { x: 220, y: 32 },
        },
      },
      customTheme: true,
    }, storage);

    expect(pwwReadFixtureWorkbenchPreferences(storage)).toMatchObject({
      version: 1,
      display: {
        presentation: "tree",
        colorScheme: "dark",
        tabBarPlacement: "editor-bottom",
        settingsPositions: {
          quick: { x: 150, y: 86 },
          full: { x: 220, y: 32 },
        },
      },
      customTheme: true,
    });
  });

  it("缺字段和非法枚举由 Wing checker 补齐", () => {
    const storage = pwwFixtureMemoryStorage(JSON.stringify({
      version: 1,
      display: {
        presentation: "unknown",
        tabBarPlacement: "removed-position",
        settingsPositions: { quick: { x: "bad" } },
      },
      customTheme: "yes",
    }));
    const preferences = pwwReadFixtureWorkbenchPreferences(storage);

    expect(preferences.display.presentation).toBe("ribbon");
    expect(preferences.display.tabBarPlacement).toBe("header");
    expect(preferences.display.settingsPositions).toEqual(
      PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES.settingsPositions,
    );
    expect(preferences.customTheme).toBe(false);
  });
});

describe("Pww fixture 导航布局偏好", () => {
  const pwwDefaultLayout = pwwCreateExampleNavigationLayoutPreference(
    PWW_FIXTURE_NAVIGATION,
    PWW_FIXTURE_NAVIGATION,
    "fixture-v1",
  );

  it("写入纯数据差量并可在刷新后读回", () => {
    const storage = pwwFixtureMemoryStorage();
    const moved = pwwMoveExampleNavigationNode(
      PWW_FIXTURE_NAVIGATION,
      "collaboration-issues",
      "workspace",
    );
    const preference = pwwCreateExampleNavigationLayoutPreference(
      moved,
      PWW_FIXTURE_NAVIGATION,
      "fixture-v1",
    );

    pwwWriteFixtureNavigationLayoutPreference(preference, storage);

    expect(pwwReadFixtureNavigationLayoutPreference(pwwDefaultLayout, storage))
      .toEqual(preference);
  });

  it("损坏快照或基础布局版本变化时回退默认布局", () => {
    const invalidStorage = pwwFixtureMemoryStorage(
      JSON.stringify({
        schemaVersion: 1,
        baseLayoutVersion: "fixture-v1",
        roots: [{ id: "workspace", label: "工作空间", order: "bad" }],
        modulePlacements: [],
      }),
      PWW_FIXTURE_NAVIGATION_LAYOUT_KEY,
    );
    expect(pwwReadFixtureNavigationLayoutPreference(pwwDefaultLayout, invalidStorage))
      .toEqual(pwwDefaultLayout);

    const oldVersionStorage = pwwFixtureMemoryStorage(
      JSON.stringify({ ...pwwDefaultLayout, baseLayoutVersion: "fixture-v0" }),
      PWW_FIXTURE_NAVIGATION_LAYOUT_KEY,
    );
    expect(pwwReadFixtureNavigationLayoutPreference(pwwDefaultLayout, oldVersionStorage))
      .toEqual(pwwDefaultLayout);
  });
});
