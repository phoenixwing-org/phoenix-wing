// SPDX-License-Identifier: Apache-2.0

import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";

/** 创建覆盖 Command Agent 生命周期块 Selector 筛选规则的测试数据。 */
export function ktCodegenCreateCommandAgentController(): KtCodegenController {
  const controller = new KtCodegenController();
  controller.param.namePrefix = "Kt";
  controller.param.nameMiddle = "CourseGuard";
  controller.param.items.splice(
    0,
    controller.param.items.length,
    ...[
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 1,
        paramString: "OriginSpec",
        dataType: "CATISpecObject_var",
        component: "SelectorList",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 2,
        paramString: "Targets",
        dataType: "UnknownList",
        component: "MultiList",
        componentCount: 0,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 3,
        paramString: "View",
        dataType: "ViewModel",
        component: "QTableView",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 4,
        paramString: "NotField",
        dataType: "double",
        component: "Spinner",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 0,
        paramString: "SkippedId",
        dataType: "CATISpecObject_var",
        component: "SelectorList",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Other",
        id: 1,
        paramString: "SkippedSuffix",
        dataType: "CATISpecObject_var",
        component: "SelectorList",
        componentCount: 1,
      }),
    ],
  );
  return controller;
}
