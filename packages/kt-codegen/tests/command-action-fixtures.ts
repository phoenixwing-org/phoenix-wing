// SPDX-License-Identifier: Apache-2.0

import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";

/** 创建覆盖 Command Action、废弃兼容和活动 Field 分支的测试数据。 */
export function ktCodegenCreateCommandActionController(): KtCodegenController {
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
        paramString: "Origin",
        dataType: "CATISpecObject_var",
        component: "SelectorList",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 2,
        paramString: "Targets",
        dataType: "CATListValCATISpecObject_var",
        component: "QListWidget",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 3,
        paramString: "Multi",
        dataType: "CATListValCATISpecObject_var",
        component: "MultiList",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 4,
        paramString: "View",
        dataType: "CATISpecObject_var",
        component: "QTableView",
        componentCount: 0,
      }),
      new KtCodegenItem({
        nameSuffix: "Cmd",
        id: 5,
        paramString: "NotField",
        dataType: "double",
        component: "Spinner",
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
