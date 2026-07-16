// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  KT_CODEGEN_LEGACY_BLOCKS,
  KT_CODEGEN_TARGETS,
  KtCodegenController,
  KtCodegenItem,
} from "../src/index.js";

describe("KtCodegen public naming", () => {
  it("uses one Kt domain identity from shared data through generated artifacts", () => {
    const controller = new KtCodegenController();
    controller.param.namePrefix = "Kt";
    controller.param.nameMiddle = "CourseGuard";
    controller.param.items.push(
      new KtCodegenItem({
        nameSuffix: "Item",
        id: 1,
        paramString: "MachineId",
        dataType: "int",
        defaultValue: "0",
      }),
    );
    const start = controller.core.marker.createStart(
      controller.param,
      "Item",
      "PARAM EQUAL",
    );
    const end = controller.core.marker.createEnd(
      controller.param,
      "Item",
      "PARAM EQUAL",
    );
    const plan = controller.analyze({
      targets: ["cpp.parameter"],
      blockKeys: ["PARAM EQUAL"],
      snapshot: {
        files: [
          {
            path: "param.cpp",
            text: `${start}\nstale\n${end}\n`,
            fingerprint: "fixture:kt-codegen-naming",
          },
        ],
      },
    });

    expect(controller.param.kind).toBe("kt.codegen");
    expect(plan.kind).toBe("kt.codegen.plan");
    expect(plan.targets[0]?.rendererId).toBe("kt.codegen.renderer.cpp");
    expect(plan.artifacts[0]?.id).toMatch(/^kt\.codegen\.artifact:/);
    expect(plan.canApply).toBe(true);
    expect(KT_CODEGEN_LEGACY_BLOCKS).toHaveLength(32);
    expect(KT_CODEGEN_TARGETS).toHaveLength(9);
  });
});
