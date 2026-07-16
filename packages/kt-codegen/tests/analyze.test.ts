// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KT_CODEGEN_LEGACY_BLOCKS } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenCore } from "../src/KtCodegenCore.js";
import { KtCodegenParam } from "../src/KtCodegenParam.js";
import { KtCodegenRenderer } from "../src/KtCodegenRenderer.js";
import { ktCodegenReadFixture } from "./helpers.js";

describe("KtCodegenController", () => {
  it("shares one data object with ready CAA, Qt and C++ renderers", () => {
    const controller = new KtCodegenController();
    expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);

    const plan = controller.analyze({
      targets: ["caa.core", "qt.dialog", "cpp.parameter"],
    });

    expect(plan.phase).toBe("preview");
    expect(plan.targets.map((target) => target.rendererId)).toEqual([
      "kt.codegen.renderer.caa",
      "kt.codegen.renderer.qt",
      "kt.codegen.renderer.cpp",
    ]);
    expect(plan.blockKeys).toHaveLength(32);
    expect(plan.canApply).toBe(false);
    expect(plan.targets.map((target) => target.status)).toEqual([
      "ready",
      "ready",
      "ready",
    ]);
    expect(plan.diagnostics).toEqual([]);
  });

  it("preserves the 32 legacy block identities without duplicate IDs or keys", () => {
    expect(KT_CODEGEN_LEGACY_BLOCKS).toHaveLength(32);
    expect(new Set(KT_CODEGEN_LEGACY_BLOCKS.map((block) => block.legacyId)).size).toBe(32);
    expect(new Set(KT_CODEGEN_LEGACY_BLOCKS.map((block) => block.key)).size).toBe(32);
    expect(KT_CODEGEN_LEGACY_BLOCKS.map((block) => block.legacyId)).toEqual(
      Array.from({ length: 32 }, (_, index) => index),
    );
  });

  it("includes safe legacy marker regions and source diagnostics in Analyze Plan", () => {
    const controller = new KtCodegenController();
    expect(controller.readJson(ktCodegenReadFixture("legacy-v4/basic.json")).ok).toBe(true);
    const text = ktCodegenReadFixture("source/legacy-markers.cpp");

    const plan = controller.analyze({
      targets: ["cpp.parameter"],
      blockKeys: ["PARAM DECLARATION"],
      snapshot: {
        files: [{ path: "legacy-markers.cpp", text, fingerprint: "fixture:markers" }],
      },
    });

    expect(plan.markerRegions).toHaveLength(1);
    expect(plan.markerRegions[0]).toMatchObject({
      path: "legacy-markers.cpp",
      classId: "KtCourseGuardItem",
      nameSuffix: "Item",
      blockKey: "PARAM DECLARATION",
    });
    expect(plan.artifacts).toHaveLength(1);
    expect(plan.canApply).toBe(true);

    const brokenPlan = controller.analyze({
      targets: ["cpp.parameter"],
      blockKeys: ["PARAM DECLARATION"],
      snapshot: {
        files: [
          {
            path: "broken.cpp",
            text: controller.core.marker.createStart(
              controller.param,
              "Item",
              "PARAM DECLARATION",
            ),
            fingerprint: "fixture:broken",
          },
        ],
      },
    });
    expect(brokenPlan.markerRegions).toEqual([]);
    expect(brokenPlan.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "marker.missing-end",
        path: expect.objectContaining({ source: "source", file: "broken.cpp", row: 0 }),
      }),
    );
  });

  it("records an auditable VB call, target and migration state for every block", () => {
    for (const block of KT_CODEGEN_LEGACY_BLOCKS) {
      expect(block.legacyCall).toMatch(/^[A-Za-z][A-Za-z0-9]+\(.*\)$/);
      expect(block.legacySourceLine).toBeGreaterThan(0);
      expect(block.target.startsWith(`${block.platform}.`)).toBe(true);
    }

    expect(
      KT_CODEGEN_LEGACY_BLOCKS.filter(
        (block) => block.migrationStatus === "migrated",
      ).map((block) => block.legacyId),
    ).toEqual(Array.from({ length: 32 }, (_, index) => index));
    expect(
      KT_CODEGEN_LEGACY_BLOCKS.every(
        (block) => block.migrationStatus === "migrated",
      ),
    ).toBe(true);

    expect(
      KT_CODEGEN_LEGACY_BLOCKS.filter(
        (block) => block.legacyState === "legacy-deprecated",
      ).map((block) => block.legacyId),
    ).toEqual([20, 21, 30]);
  });

  it("rejects a custom Renderer artifact that is not linked to a scanned region", () => {
    const core = new KtCodegenCore([
      new KtCodegenRenderer({
        id: "test.unbound-renderer",
        platform: "cpp",
        targets: ["cpp.parameter"],
        render: () => ({
          status: "ready",
          artifacts: [
            {
              id: "test.unbound-artifact",
              regionId: "missing-region",
              target: "cpp.parameter",
              blockKey: "PARAM EQUAL",
              classId: "TestItem",
              content: "candidate",
              sourceParameters: [],
            },
          ],
          diagnostics: [],
        }),
      }),
    ]);
    const plan = core.analyze(new KtCodegenParam(), {
      targets: ["cpp.parameter"],
      blockKeys: ["PARAM EQUAL"],
    });

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "artifact.region-not-found",
    );
  });
});
