// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenDataResult } from "./model/diagnostic.js";
import type { KtCodegenLegacyCsvWriteOptions } from "./legacy/csv.js";
import type {
  KtCodegenAnalyzeRequest,
  KtCodegenPlan,
} from "./api/contracts.js";
import { KtCodegenAdapter } from "./KtCodegenAdapter.js";
import { KtCodegenCore } from "./KtCodegenCore.js";
import { KtCodegenParam } from "./KtCodegenParam.js";
import { KtCodegenReader } from "./KtCodegenReader.js";

/**
 * 宿主编排层：维护共享 Param，并协调 Reader、Adapter 与 Core。
 *
 * `kt-auto-code` 或 `phoenix-desk-tools` 通常持有一个 Controller。界面、表格和
 * 生成流程都通过 `param` 访问同一数据实例。Controller 不实现具体 CSV/JSON
 * 语法，也不包含目标代码生成算法。
 */
export class KtCodegenController {
  /** 最近一次成功读取的旧 JSON 根字段顺序；CSV/原生数据不带布局模板。 */
  private legacyJsonRootKeys: string[] = [];

  /** MVC-C 各消费者共享的唯一参数数据实例。 */
  public readonly param: KtCodegenParam;

  /** CSV/JSON 输入边界；先读取临时数据，不直接修改共享实例。 */
  public readonly reader: KtCodegenReader;

  /** 旧格式写出和共享实例原地更新边界。 */
  public readonly adapter: KtCodegenAdapter;

  /** 与 UI 和文件系统无关的 Analyze/生成核心。 */
  public readonly core: KtCodegenCore;

  /**
   * 创建 Controller，并允许宿主注入共享数据或自定义职责实现。
   *
   * 未注入的对象使用标准默认实现。`param` 属性本身只读，避免宿主意外替换
   * 共享实例；其中的公开字段仍可按 MVC-C 约定直接修改。
   */
  constructor(options: {
    param?: KtCodegenParam;
    reader?: KtCodegenReader;
    adapter?: KtCodegenAdapter;
    core?: KtCodegenCore;
  } = {}) {
    this.param = options.param ?? new KtCodegenParam();
    this.reader = options.reader ?? new KtCodegenReader();
    this.adapter = options.adapter ?? new KtCodegenAdapter();
    this.core = options.core ?? new KtCodegenCore();
  }

  /**
   * 读取旧 v4 JSON；只有完整读取成功后才原地更新共享 `param`。
   *
   * 失败时保留此前所有共享数据，并通过结果返回诊断。
   */
  readJson(input: string | unknown): KtCodegenDataResult<KtCodegenParam> {
    const result = this.applyReadResult(this.reader.readJson(input));
    if (result.ok && result.value) this.legacyJsonRootKeys = this.readRootKeys(input);
    return result;
  }

  /**
   * 读取旧17列 CSV；只有完整读取成功后才原地更新共享 `param`。
   *
   * 失败时保留此前所有共享数据，并通过结果返回诊断。
   */
  readCsv(text: string): KtCodegenDataResult<KtCodegenParam> {
    const result = this.applyReadResult(this.reader.readCsv(text));
    if (result.ok && result.value) this.legacyJsonRootKeys = [];
    return result;
  }

  /** 将当前共享数据写成旧 v4 JSON，不执行文件系统写入。 */
  writeJson(space = 4): KtCodegenDataResult<string> {
    return this.adapter.writeJson(this.param, space, this.legacyJsonRootKeys);
  }

  /** 将当前共享数据写成旧17列 CSV，不执行文件系统写入。 */
  writeCsv(options: KtCodegenLegacyCsvWriteOptions = {}): KtCodegenDataResult<string> {
    return this.adapter.writeCsv(this.param, options);
  }

  /** 清空共享数据内容，但不替换 `param`、`items` 等共享容器引用。 */
  clear(): void {
    this.adapter.clear(this.param);
    this.legacyJsonRootKeys = [];
  }

  /**
   * 使用当前共享数据分析指定目标，并返回不可直接写文件的生成计划。
   *
   * 当前会扫描调用者提供的源码快照；普通 C++、CAA 与 Qt 共三十二块
   * 可以产生 artifact。Analyze 只返回计划，不直接写文件。
   */
  analyze(request: Omit<KtCodegenAnalyzeRequest, "param">): KtCodegenPlan {
    return this.core.analyze(this.param, request);
  }

  /** 把成功读取的临时数据应用到共享实例；失败结果直接向调用者传递。 */
  private applyReadResult(
    result: KtCodegenDataResult<KtCodegenParam>,
  ): KtCodegenDataResult<KtCodegenParam> {
    if (!result.ok || !result.value) return result;
    this.adapter.replace(this.param, result.value);
    return { ...result, value: this.param };
  }

  /** 成功解析后的第二次轻量读取只提取布局，不参与数据语义。 */
  private readRootKeys(input: string | unknown): string[] {
    try {
      const value = typeof input === "string" ? JSON.parse(input) as unknown : input;
      return typeof value === "object" && value !== null && !Array.isArray(value)
        ? Object.keys(value)
        : [];
    } catch {
      return [];
    }
  }
}
