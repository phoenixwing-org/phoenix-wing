// SPDX-License-Identifier: Apache-2.0

import { KtCodegenController } from "../src/KtCodegenController.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";

/** 创建覆盖五类 Selector Field 及排除分支的共享参数测试数据。 */
export function ktCodegenCreateDialogFieldController(): KtCodegenController {
  const controller = new KtCodegenController();
  controller.param.namePrefix = "Kt";
  controller.param.nameMiddle = "CourseGuard";
  controller.param.items.splice(
    0,
    controller.param.items.length,
    ...[
      new KtCodegenItem({
        nameSuffix: "Dlg",
        id: 1,
        paramString: "OriginSpec",
        dataType: "CATISpecObject_var",
        component: "SelectorList",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Dlg",
        id: 2,
        paramString: "Targets",
        dataType: "CATListValCATISpecObject_var",
        component: "MultiList",
        componentCount: 0,
      }),
      new KtCodegenItem({
        nameSuffix: "Dlg",
        id: 3,
        paramString: "QtList",
        dataType: "UnknownType",
        component: "QListWidget",
        componentCount: 0,
      }),
      new KtCodegenItem({
        nameSuffix: "Dlg",
        id: 4,
        paramString: "Table",
        dataType: "TableModel",
        component: "QTableWidget",
        componentCount: 2,
      }),
      new KtCodegenItem({
        nameSuffix: "Dlg",
        id: 5,
        paramString: "View",
        dataType: "ViewModel",
        component: "QTableView",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Dlg",
        id: 6,
        paramString: "NotField",
        dataType: "double",
        component: "Spinner",
        componentCount: 1,
      }),
      new KtCodegenItem({
        nameSuffix: "Dlg",
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
