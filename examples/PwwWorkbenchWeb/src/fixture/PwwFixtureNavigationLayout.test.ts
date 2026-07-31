import { describe, expect, it } from "vitest";
import { PWW_FIXTURE_NAVIGATION } from "./PwwFixtureNavigation.js";
import {
  pwwAddExampleNavigationRoot,
  pwwApplyExampleNavigationLayoutPreference,
  pwwCreateExampleNavigationLayoutPreference,
  pwwDeleteExampleNavigationRoot,
  pwwNavigationModulePlacements,
  pwwFindExampleRootId,
  pwwMoveExampleNavigationNode,
  pwwRestoreExampleNavigationRootDefinition,
  pwwUpdateExampleNavigationRoot,
} from "./PwwFixtureNavigationLayout.js";

describe("PwwWorkbenchWeb 导航小模块布局 fixture", () => {
  it("只枚举一级大分组的直接子模块", () => {
    expect(pwwNavigationModulePlacements(PWW_FIXTURE_NAVIGATION)
      .map(({ root, module }) => `${root.id}/${module.id}`))
      .toEqual([
        "workspace/workspace-overview",
        "workspace/workspace-data",
        "development/development-code",
        "collaboration/collaboration-issues",
        "system/system-workbench",
      ]);
  });

  it("整体移动小模块并隐藏空大分组，移回后重新显示", () => {
    const moved = pwwMoveExampleNavigationNode(
      PWW_FIXTURE_NAVIGATION,
      "collaboration-issues",
      "workspace",
    );

    expect(pwwFindExampleRootId(moved, "collaboration-issues")).toBe("workspace");
    expect(pwwFindExampleRootId(moved, "issues")).toBe("workspace");
    expect(moved.find((root) => root.id === "collaboration")?.hidden).toBe(true);

    const restoredTarget = pwwMoveExampleNavigationNode(
      moved,
      "collaboration-issues",
      "collaboration",
    );
    expect(pwwFindExampleRootId(restoredTarget, "issues")).toBe("collaboration");
    expect(restoredTarget.find((root) => root.id === "collaboration")?.hidden).toBe(false);
  });

  it("新建时只增加隐藏的空大分组，移入模块后才参与导航呈现", () => {
    const withRoot = pwwAddExampleNavigationRoot(PWW_FIXTURE_NAVIGATION, {
      label: "质量管理",
      shortLabel: "质量",
    });
    const qualityRoot = withRoot.find((root) => root.label === "质量管理");
    expect(qualityRoot).toMatchObject({
      id: "custom-group-1",
      shortLabel: "质量",
      hidden: true,
      children: [],
    });

    const moved = pwwMoveExampleNavigationNode(withRoot, "development-code", qualityRoot!.id);
    expect(moved.find((root) => root.id === qualityRoot!.id)?.hidden).toBe(false);
    expect(pwwFindExampleRootId(moved, "codegen")).toBe(qualityRoot!.id);
  });

  it("内置大分组不可删除，自定义大分组仅为空时可删除", () => {
    const withRoot = pwwAddExampleNavigationRoot(PWW_FIXTURE_NAVIGATION, {
      label: "质量管理",
      shortLabel: "质量",
    });
    const customRootId = withRoot.find((root) => root.label === "质量管理")!.id;

    expect(pwwDeleteExampleNavigationRoot(
      withRoot,
      PWW_FIXTURE_NAVIGATION,
      "workspace",
    )).toHaveLength(withRoot.length);

    const occupied = pwwMoveExampleNavigationNode(withRoot, "development-code", customRootId);
    expect(pwwDeleteExampleNavigationRoot(
      occupied,
      PWW_FIXTURE_NAVIGATION,
      customRootId,
    )).toHaveLength(occupied.length);

    expect(pwwDeleteExampleNavigationRoot(
      withRoot,
      PWW_FIXTURE_NAVIGATION,
      customRootId,
    ).some((root) => root.id === customRootId)).toBe(false);
  });

  it("编辑大分组定义时保持稳定 ID 和模块归属，内置定义可独立恢复", () => {
    const moved = pwwMoveExampleNavigationNode(
      PWW_FIXTURE_NAVIGATION,
      "collaboration-issues",
      "workspace",
    );
    const updated = pwwUpdateExampleNavigationRoot(moved, "collaboration", {
      label: "团队协作",
      shortLabel: "团队",
      order: 80,
    });

    expect(updated.find((root) => root.id === "collaboration")).toMatchObject({
      label: "团队协作",
      shortLabel: "团队",
      order: 80,
      hidden: true,
    });
    expect(pwwFindExampleRootId(updated, "collaboration-issues")).toBe("workspace");

    const restored = pwwRestoreExampleNavigationRootDefinition(
      updated,
      PWW_FIXTURE_NAVIGATION,
      "collaboration",
    );
    expect(restored.find((root) => root.id === "collaboration")).toMatchObject({
      label: "协同管理",
      shortLabel: "协同",
      order: 30,
      hidden: true,
    });
    expect(pwwFindExampleRootId(restored, "collaboration-issues")).toBe("workspace");
  });

  it("统一序列化全部大分组定义和模块归属，并可从默认树恢复", () => {
    const withRoot = pwwAddExampleNavigationRoot(PWW_FIXTURE_NAVIGATION, {
      label: "质量管理",
      shortLabel: "质量",
    });
    const customRootId = withRoot.find((root) => root.label === "质量管理")!.id;
    const moved = pwwMoveExampleNavigationNode(withRoot, "development-code", customRootId);
    const current = pwwUpdateExampleNavigationRoot(moved, "development", {
      label: "工程研发",
      shortLabel: "工程",
      order: 25,
    });
    const preference = pwwCreateExampleNavigationLayoutPreference(
      current,
      PWW_FIXTURE_NAVIGATION,
      "fixture-v1",
    );

    expect(JSON.parse(JSON.stringify(preference))).toEqual(preference);
    expect(preference.roots.find((root) => root.id === "development")).toEqual({
      id: "development",
      label: "工程研发",
      shortLabel: "工程",
      order: 25,
    });
    expect(preference.roots.find((root) => root.id === customRootId)).toEqual({
      id: customRootId,
      label: "质量管理",
      shortLabel: "质量",
      order: 50,
    });
    expect(preference.modulePlacements.some((placement) => placement.moduleId === "codegen"))
      .toBe(false);

    const hydrated = pwwApplyExampleNavigationLayoutPreference(
      PWW_FIXTURE_NAVIGATION,
      preference,
      "fixture-v1",
    );
    expect(pwwFindExampleRootId(hydrated, "development-code")).toBe(customRootId);
    expect(pwwFindExampleRootId(hydrated, "codegen")).toBe(customRootId);
    expect(hydrated.find((root) => root.id === "development")).toMatchObject({
      label: "工程研发",
      shortLabel: "工程",
      order: 25,
    });
  });

  it("偏好基础版本不兼容时回退默认树", () => {
    const preference = pwwCreateExampleNavigationLayoutPreference(
      pwwUpdateExampleNavigationRoot(PWW_FIXTURE_NAVIGATION, "development", {
        label: "工程研发",
        shortLabel: "工程",
      }),
      PWW_FIXTURE_NAVIGATION,
      "fixture-v1",
    );

    expect(pwwApplyExampleNavigationLayoutPreference(
      PWW_FIXTURE_NAVIGATION,
      preference,
      "fixture-v2",
    )).toEqual(PWW_FIXTURE_NAVIGATION);
  });
});
