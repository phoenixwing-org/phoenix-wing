// SPDX-License-Identifier: Apache-2.0

import { KtCodegenItem } from "./KtCodegenItem.js";

/** 配置数据进入统一模型之前的来源格式。 */
export type KtCodegenSourceFormat =
  | "legacy-v4-json"
  | "legacy-17-column-csv"
  | "native";

/** 读取旧配置时保留的格式、协议和扩展字段信息。 */
export interface KtCodegenSource {
  /** 当前实例最初来自旧 v4 JSON、旧17列 CSV，还是原生 TS 创建。 */
  format: KtCodegenSourceFormat;

  /** 旧 JSON 根字段 `type`；当前兼容值为 `100106`。 */
  legacyType: string;

  /** 旧 JSON 根字段 `version`；当前兼容值为 `4.0`。 */
  legacyVersion: string;

  /** 输入文件中的原始表头顺序，用于兼容检查和问题诊断。 */
  headers: string[];

  /** 未被当前模型识别的旧 JSON 根字段，写回时不得丢失。 */
  extensions: Record<string, unknown>;
}

/**
 * KtCodegen 的唯一共享参数数据容器。
 *
 * 对应旧 VB `KevinCAAFileGuide` 的类级 `_Name*` 与 `_FieldList`、C++
 * `KtaControlConfigData`，以及 Qt `KtdAutoCodeParam` 的配置子集。文件路径、
 * 搜索文本、选中行等宿主运行状态不属于本类。
 *
 * 所有成员公开、可变，不生成 getter/setter。Model、View、Controller、Core
 * 和 Renderer 应共享同一个实例；一处修改会立即对其他持有者可见。
 *
 * 本类只维护数据和最小构造初始化，不负责 CSV/JSON、校验、清空、复制或
 * 代码生成。这些操作分别属于 Reader、Adapter、Controller 和 Core。
 */
export class KtCodegenParam {
  /** 原生模型类型标识，用于与其他 Phoenix Wing 数据对象区分。 */
  public kind: "kt.codegen" = "kt.codegen";

  /** TypeScript 领域模型版本；与旧文件的 `version: 4.0` 相互独立。 */
  public schemaVersion: 1 = 1;

  /** 输入配置的来源协议、原始表头和未知扩展字段。 */
  public source: KtCodegenSource = {
    format: "native",
    legacyType: "100106",
    legacyVersion: "4.0",
    headers: [],
    extensions: {},
  };

  /** 类名或生成符号的公共前缀，对应旧配置 `NamePrefix`。 */
  public namePrefix: string = "";

  /** 类名或生成符号的主体名称，对应旧配置 `NameMiddle`。 */
  public nameMiddle: string = "";

  /** 生成代码使用的命名空间，对应旧配置 `NameSpace`。 */
  public nameSpace: string = "";

  /** 列表或集合生成时使用的追加函数名，对应旧配置 `AppendFunction`。 */
  public appendFunction: string = "";

  /**
   * 当前配置包含的参数项。
   *
   * Controller 通过 Adapter 使用原数组 `splice` 更新内容，避免持有此数组
   * 引用的 UI、Core 或 Renderer 在重新读取配置后失去共享关系。
   */
  public items: KtCodegenItem[] = [];

  /**
   * 创建共享参数数据，并可用同名字段进行初始化。
   *
   * 构造时复制 `source`、`headers`、`extensions` 和 `items`，避免初始化对象
   * 与新实例意外共享可变的嵌套容器。不会执行读写、校验或自动修正。
   */
  constructor(initial?: Partial<KtCodegenParam>) {
    if (!initial) return;

    this.kind = initial.kind ?? this.kind;
    this.schemaVersion = initial.schemaVersion ?? this.schemaVersion;
    this.source = {
      ...this.source,
      ...initial.source,
      headers: [...(initial.source?.headers ?? this.source.headers)],
      extensions: { ...(initial.source?.extensions ?? this.source.extensions) },
    };
    this.namePrefix = initial.namePrefix ?? this.namePrefix;
    this.nameMiddle = initial.nameMiddle ?? this.nameMiddle;
    this.nameSpace = initial.nameSpace ?? this.nameSpace;
    this.appendFunction = initial.appendFunction ?? this.appendFunction;
    this.items = (initial.items ?? this.items).map((item) => new KtCodegenItem(item));
  }
}
