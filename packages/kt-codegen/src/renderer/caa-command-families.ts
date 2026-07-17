// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenCaaAlgorithms,
  KtCodegenRendererContext,
} from "../KtCodegenRenderer.js";
import type { KtCodegenRendererFamily } from "./family-registry.js";
import {
  ktCodegenRenderLegacyEnd,
  ktCodegenRenderLegacyStart,
} from "./legacy-compatibility.js";

const CAA_DIALOG_FIELD_BLOCKS = [
  "DLG DEFINE FIELD TYPE",
  "DLG SET ACTIVE FIELD",
  "DLG GET SELECTOR LIST",
] as const satisfies readonly KtCodegenBlockKey[];

const CAA_COMMAND_AGENT_LIFECYCLE_BLOCKS = [
  "CMD AGENT DECLARE",
  "CMD AGENT CONSTRUCTOR",
  "CMD AGENT DESTRUCTOR",
] as const satisfies readonly KtCodegenBlockKey[];

const CAA_COMMAND_GRAPH_STATE_BLOCKS = [
  "CMD AGENT BUILD GRAPH",
  "CMD AGENT UPDATE STATE",
  "CMD AGENT FIA CLEAR",
] as const satisfies readonly KtCodegenBlockKey[];

const CAA_COMMAND_ACTION_BLOCKS = [
  "CMD ACTION PDA",
  "CMD ACTION FIA",
  "CMD ELEMENT SELECTED",
  "CMD SET ACTIVE FIELD",
] as const satisfies readonly KtCodegenBlockKey[];

function selectorItems(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  algorithms: KtCodegenCaaAlgorithms,
): KtCodegenItem[] {
  return context.param.items.filter(
    (item) => item.nameSuffix === region.nameSuffix && algorithms.isSelectorField(item),
  );
}
/** 取得旧 `KevinControlID.ToString()` 写入 Selector 块的枚举名称。 */
function ktCodegenSelectorBlockTitle(blockKey: KtCodegenBlockKey): string {
  switch (blockKey) {
    case "DLG DEFINE FIELD TYPE":
      return "DlgDefineFieldType";
    case "DLG SET ACTIVE FIELD":
      return "DlgSetActiveField";
    case "DLG GET SELECTOR LIST":
      return "DlgGetSelectorList";
    case "CMD AGENT DECLARE":
      return "CmdAgentDeclare";
    case "CMD AGENT CONSTRUCTOR":
      return "CmdAgentConstructor";
    case "CMD AGENT DESTRUCTOR":
      return "CmdAgentDestructor";
    case "CMD AGENT BUILD GRAPH":
      return "CmdAgentBuildGraph";
    case "CMD AGENT UPDATE STATE":
      return "CmdAgentUpdateState";
    case "CMD AGENT FIA CLEAR":
      return "CmdAgentFiaClear";
    case "CMD ACTION PDA":
      return "CmdActionPda";
    case "CMD ACTION FIA":
      return "CmdActionFia";
    case "CMD ELEMENT SELECTED":
      return "CmdElementSelected";
    case "CMD SET ACTIVE FIELD":
      return "CmdSetActiveField";
    default:
      throw new Error(`Unsupported selector block: ${blockKey}`);
  }
}
/** 按旧 `AutoCodeStartSelector` 规则生成 Field 块公共头部。 */
function ktCodegenRenderSelectorStart(
  region: KtCodegenMarkerRegion,
  notes: readonly string[] = [],
): string[] {
  const prefix = region.start.linePrefix;
  const separator = "//.............................................................................";
  return [
    ...ktCodegenRenderLegacyStart(region),
    `${prefix}${separator}`,
    `${prefix}// @key    ${ktCodegenSelectorBlockTitle(region.blockKey)}`,
    ...notes.map((note) => `${prefix}// ${note}`),
    `${prefix}${separator}`,
  ];
}

/** 创建旧 Field enum 使用的 `Field_<Class>_` 公共前缀。 */
function ktCodegenFieldTypePrefix(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
): string {
  return `Field_${context.param.namePrefix}${context.param.nameMiddle}${region.nameSuffix}_`;
}

/** 按旧 Dialog Selector 三个方法生成 Field 定义和兼容访问逻辑。 */
function ktCodegenRenderCaaDialogFieldLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
): string[] {
  const prefix = region.start.linePrefix;
  const fieldPrefix = ktCodegenFieldTypePrefix(context, region);

  if (region.blockKey === "DLG DEFINE FIELD TYPE") {
    const lines = ktCodegenRenderSelectorStart(region);
    lines.push(`${prefix}${fieldPrefix}None = 0, // None`);
    items.forEach((item, index) => {
      lines.push(
        `${prefix}${fieldPrefix}${item.paramString} = ${index + 1}, // ${item.paramString}`,
      );
    });
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "DLG SET ACTIVE FIELD") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Dlg::SetActiveField()",
      "@brief  Set Active Field, clear other field.",
    ]);
    for (const item of items) {
      lines.push(
        `${prefix}if (${fieldPrefix}${item.paramString} != field)`,
        `${prefix}    _SelectorList${item.paramString}->ClearSelect();`,
      );
    }
    lines.push(`${prefix}_ActiveField = field;`);
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  const lines = ktCodegenRenderSelectorStart(region, [
    "@usage  put this code block into the function Dlg::GetSelectorList()",
    "@brief  get SelectorList",
  ]);
  lines.push(`${prefix}// Field count = ${items.length}`);
  if (items.length === 0) {
    lines.push(`${prefix}return NULL;`);
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }
  lines.push(`${prefix}switch (field) {`);
  for (const item of items) {
    lines.push(
      `${prefix}case ${fieldPrefix}${item.paramString}:`,
      `${prefix}    return _SelectorList${item.paramString};`,
    );
  }
  lines.push(`${prefix}default:`, `${prefix}    return NULL;`, `${prefix}}`);
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 按旧 Command Selector 规则生成 Agent 声明、构造初始化和析构清理。 */
function ktCodegenRenderCaaCommandAgentLifecycleLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderSelectorStart(region);

  if (region.blockKey === "CMD AGENT DECLARE") {
    lines.push(
      `${prefix}KT_AUTO_CMD_AGENT_DECLARE_COMMON();`,
      `${prefix}KT_AUTO_CMD_AGENT_DECLARE_BASE(${context.param.namePrefix}, ${context.param.nameMiddle}${region.nameSuffix});`,
      "",
      `${prefix}// Field count = ${items.length}`,
    );
    for (const item of items) {
      lines.push(`${prefix}KT_AUTO_CMD_AGENT_DECLARE_FIELD(${item.paramString});`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD AGENT CONSTRUCTOR") {
    lines.push(`${prefix}, KT_AUTO_CMD_AGENT_CONSTRUCTOR_COMMON()`);
    for (const item of items) {
      lines.push(
        `${prefix}, KT_AUTO_CMD_AGENT_CONSTRUCTOR_FIELD(${item.paramString})`,
      );
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  lines.push(`${prefix}// Field count = ${items.length}`);
  for (const item of items) {
    lines.push(`${prefix}KT_AUTO_CMD_AGENT_DESTRUCTOR_FIELD(${item.paramString});`);
  }
  lines.push(
    "",
    `${prefix}// place at the end`,
    `${prefix}KT_AUTO_CMD_AGENT_DESTRUCTOR_COMMON();`,
  );
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 为旧 Command Field 不支持分支生成可见原因注释。 */
function ktCodegenRenderUnsupportedCommandField(
  item: KtCodegenItem,
  prefix: string,
  indent = "",
): string[] {
  return [
    `${prefix}${indent}// Please write your own code outside.`,
    item.componentCount === 0
      ? `${prefix}${indent}// Because the component count is 0.`
      : `${prefix}${indent}// Because ${item.component} is not supported.`,
  ];
}

/** 按旧规则生成 BuildGraph、FIA Clear 和 UpdateState 三个 Command 块。 */
function ktCodegenRenderCaaCommandGraphStateLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  algorithms: KtCodegenCaaAlgorithms,
): string[] {
  const prefix = region.start.linePrefix;

  if (region.blockKey === "CMD AGENT BUILD GRAPH") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::BuildGraph()",
      "@brief  set agent, AddTransition",
      "RegisterFiled() will set suggested menu id by input name. You can change it later",
    ]);
    lines.push(
      "",
      `${prefix}// Build Start .......................`,
      `${prefix}KT_AUTO_CMD_BUILD_START(${region.classId});`,
      "",
      `${prefix}// Field count = ${items.length}`,
    );
    items.forEach((item, index) => {
      lines.push(
        "",
        `${prefix}// Field ${index + 1} ${item.paramString} .......................`,
        `${prefix}// ${index + 1}.1 define fia`,
      );
      if (algorithms.isCommandAutoField(item)) {
        lines.push(
          `${prefix}KT_AUTO_CMD_BUILD_FIA_${algorithms.getCommandSuggestedFilter(item.paramString)}(${item.paramString});`,
          `${prefix}// ${index + 1}.2 others`,
          `${prefix}KT_AUTO_CMD_BUILD_FIELD(${region.classId}, ${item.paramString});`,
        );
      } else {
        lines.push(...ktCodegenRenderUnsupportedCommandField(item, prefix));
      }
    });
    lines.push(
      "",
      `${prefix}// Build End .......................`,
      `${prefix}KT_AUTO_CMD_BUILD_END(${region.classId});`,
    );
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD AGENT FIA CLEAR") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::fiaAgentClear()",
      "@brief  clear select state",
    ]);
    for (const item of items) {
      lines.push(`${prefix}KT_AUTO_CMD_ACTION_FIA_CLEAR(${item.paramString});`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  const lines = ktCodegenRenderSelectorStart(region, [
    "@usage  put this code block into the function Cmd::fiaAgentUpdate()",
    "@brief  Update select state",
  ]);
  lines.push(`${prefix}// Field count = ${items.length}`);
  if (items.length > 0) {
    const fieldPrefix = ktCodegenFieldTypePrefix(context, region);
    lines.push(`${prefix}switch (field) {`);
    for (const item of items) {
      lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
      if (algorithms.isCommandAutoField(item)) {
        lines.push(
          `${prefix}    KT_AUTO_CMD_AGENT_UPDATE_STATE(${item.paramString});`,
        );
      } else {
        lines.push(...ktCodegenRenderUnsupportedCommandField(item, prefix, "    "));
      }
      lines.push(`${prefix}    break;`);
    }
    lines.push(
      `${prefix}case 0:`,
      `${prefix}    KT_AUTO_CMD_AGENT_UPDATE_STATE_ERROR();`,
      `${prefix}}`,
    );
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 生成 Command Action 自动宏或旧人工实现提示。 */
function ktCodegenAppendCommandAction(
  lines: string[],
  item: KtCodegenItem,
  prefix: string,
  macro: "KT_AUTO_CMD_ACTION_PDA" | "KT_AUTO_CMD_ACTION_FIA" | "KT_AUTO_HSO_ADD",
  isCommandAutoField: (item: KtCodegenItem) => boolean,
): void {
  if (isCommandAutoField(item)) {
    lines.push(`${prefix}    ${macro}(${item.paramString});`);
    return;
  }
  lines.push(...ktCodegenRenderUnsupportedCommandField(item, prefix, "    "));
}

/** 按旧规则生成 PDA、FIA、废弃 ElementSelected 和活动 Field 四个块。 */
function ktCodegenRenderCaaCommandActionLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  algorithms: KtCodegenCaaAlgorithms,
): string[] {
  const prefix = region.start.linePrefix;
  const fieldPrefix = ktCodegenFieldTypePrefix(context, region);

  if (region.blockKey === "CMD ACTION PDA") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::ActionSelectorListPda()",
      "@brief  InitializeAcquisition and HSO Append",
    ]);
    lines.push(`${prefix}// Field count = ${items.length}`);
    if (items.length > 0) {
      lines.push(
        `${prefix}if (fieldChange) KT_AUTO_HSO_CLEAR();`,
        `${prefix}switch (field) {`,
      );
      for (const item of items) {
        lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
        ktCodegenAppendCommandAction(
          lines,
          item,
          prefix,
          "KT_AUTO_CMD_ACTION_PDA",
          algorithms.isCommandAutoField,
        );
        lines.push(`${prefix}    break;`);
      }
      lines.push(`${prefix}}`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD ACTION FIA") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::ActionSelectorListFia()",
      "@brief  Action object selected",
    ]);
    lines.push(`${prefix}// Field count = ${items.length}`, `${prefix}int count = 0;`);
    if (items.length > 0) {
      lines.push(`${prefix}switch (field) {`);
      for (const item of items) {
        lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
        ktCodegenAppendCommandAction(
          lines,
          item,
          prefix,
          "KT_AUTO_CMD_ACTION_FIA",
          algorithms.isCommandAutoField,
        );
        lines.push(`${prefix}    break;`);
      }
      lines.push(`${prefix}}`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD ELEMENT SELECTED") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::AfterElementSelected()",
      "@brief  After Element Selected",
      "@brief  !Discard. Replaced by CMD ACTION FIA",
    ]);
    lines.push(`${prefix}// Field count = ${items.length}`);
    if (items.length > 0) {
      lines.push(`${prefix}switch (field) {`);
      for (const item of items) {
        const parameter = `parameter->${item.paramString}`;
        lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
        if (item.dataType === "CATListValCATISpecObject_var") {
          lines.push(
            `${prefix}    if (${parameter}.Locate(spiSpecOnSelection) == 0)`,
            `${prefix}    {`,
            `${prefix}        ${parameter}.Append(spiSpecOnSelection);`,
            `${prefix}    }`,
            `${prefix}    else`,
            `${prefix}    {`,
            `${prefix}        _ktcHSO.RemoveElement(pPathElement);`,
            `${prefix}        ${parameter}.RemoveValue(spiSpecOnSelection);`,
            `${prefix}    }`,
          );
        } else {
          lines.push(
            `${prefix}    if (${parameter} == spiSpecOnSelection)`,
            `${prefix}    {`,
            `${prefix}        _ktcHSO.RemoveElement(pPathElement);`,
            `${prefix}        ${parameter} = NULL_var;`,
            `${prefix}    }`,
            `${prefix}    else`,
            `${prefix}    {`,
            `${prefix}        _ktcHSO.RemoveElement(${parameter});`,
            `${prefix}        ${parameter} = spiSpecOnSelection;`,
            `${prefix}    }`,
          );
        }
        lines.push(`${prefix}    break;`);
      }
      lines.push(`${prefix}}`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  const lines = ktCodegenRenderSelectorStart(region, [
    "@usage  put this code block into the function Cmd::SetActiveField()",
    "@brief  Set Active Field, clear other field, update select agent...",
  ]);
  lines.push(`${prefix}// Field count = ${items.length}`, "", `${prefix}KT_AUTO_HSO_CLEAR();`);
  if (items.length > 0) {
    lines.push(`${prefix}switch (field) {`);
    for (const item of items) {
      lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
      ktCodegenAppendCommandAction(
        lines,
        item,
        prefix,
        "KT_AUTO_HSO_ADD",
        algorithms.isCommandAutoField,
      );
      lines.push(`${prefix}    break;`);
    }
    lines.push(`${prefix}default:`, `${prefix}    break;`, `${prefix}}`);
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

const dialogFieldFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.dialog-field",
  blockKeys: CAA_DIALOG_FIELD_BLOCKS,
  renderRegion(context, region, algorithms) {
    const items = selectorItems(context, region, algorithms);
    return { items, lines: ktCodegenRenderCaaDialogFieldLines(context, region, items) };
  },
};

const commandAgentLifecycleFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.command-agent-lifecycle",
  blockKeys: CAA_COMMAND_AGENT_LIFECYCLE_BLOCKS,
  renderRegion(context, region, algorithms) {
    const items = selectorItems(context, region, algorithms);
    return {
      items,
      lines: ktCodegenRenderCaaCommandAgentLifecycleLines(context, region, items),
    };
  },
};

const commandGraphStateFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.command-graph-state",
  blockKeys: CAA_COMMAND_GRAPH_STATE_BLOCKS,
  renderRegion(context, region, algorithms) {
    const items = selectorItems(context, region, algorithms);
    return {
      items,
      lines: ktCodegenRenderCaaCommandGraphStateLines(context, region, items, algorithms),
    };
  },
};

const commandActionFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.command-action",
  blockKeys: CAA_COMMAND_ACTION_BLOCKS,
  renderRegion(context, region, algorithms) {
    const items = selectorItems(context, region, algorithms);
    return {
      items,
      lines: ktCodegenRenderCaaCommandActionLines(context, region, items, algorithms),
    };
  },
};

export const KT_CODEGEN_CAA_COMMAND_FAMILIES = [
  dialogFieldFamily,
  commandAgentLifecycleFamily,
  commandGraphStateFamily,
  commandActionFamily,
] as const satisfies readonly KtCodegenRendererFamily<KtCodegenCaaAlgorithms>[];
