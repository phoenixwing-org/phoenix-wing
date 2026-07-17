// SPDX-License-Identifier: Apache-2.0

import {
  ktCodegenHasDiagnosticErrors,
  type KtCodegenDataResult,
} from "./model/diagnostic.js";
import {
  ktCodegenWriteLegacyCsv,
  type KtCodegenLegacyCsvWriteOptions,
} from "./legacy/csv.js";
import { ktCodegenWriteLegacyV4Json } from "./legacy/v4-json.js";
import { ktCodegenValidateParam } from "./model/validate.js";
import { KtCodegenItem } from "./KtCodegenItem.js";
import { KtCodegenParam } from "./KtCodegenParam.js";

/**
 * 统一数据与旧格式之间的双向适配，以及共享实例的显式维护操作。
 *
 * Adapter 不持有业务状态。它负责把 `KtCodegenParam` 写成旧 v4 JSON/CSV，
 * 并在 Controller 成功读取新配置后，把临时数据复制到原共享实例中。
 * 未知 Combo 字符串不会在适配过程中被清空或替换。
 */
export class KtCodegenAdapter {
  /**
   * 用 `source` 的内容更新 `target`，但保留 `target` 及其主要嵌套容器的引用。
   *
   * `source` 中的 Item 会复制为新实例；`target.items`、`source.headers` 和
   * `source.extensions` 对应的目标容器通过原地修改维护共享关系。
   *
   * @returns 传入的 `target`，便于 Controller 继续返回同一个共享实例。
   */
  replace(target: KtCodegenParam, source: KtCodegenParam): KtCodegenParam {
    if (target === source) return target;

    const sourceHeaders = [...source.source.headers];
    const sourceExtensions = { ...source.source.extensions };
    const sourceItems = source.items.map((item) => new KtCodegenItem(item));

    target.kind = source.kind;
    target.schemaVersion = source.schemaVersion;
    target.source.format = source.source.format;
    target.source.legacyType = source.source.legacyType;
    target.source.legacyVersion = source.source.legacyVersion;
    target.source.headers.splice(0, target.source.headers.length, ...sourceHeaders);

    for (const key of Object.keys(target.source.extensions)) {
      delete target.source.extensions[key];
    }
    Object.assign(target.source.extensions, sourceExtensions);

    target.namePrefix = source.namePrefix;
    target.nameMiddle = source.nameMiddle;
    target.nameSpace = source.nameSpace;
    target.appendFunction = source.appendFunction;
    target.items.splice(
      0,
      target.items.length,
      ...sourceItems,
    );
    return target;
  }

  /**
   * 把共享实例恢复为原生空配置，同时保留该实例和主要嵌套容器的引用。
   *
   * @returns 已清空的 `target`。
   */
  clear(target: KtCodegenParam): KtCodegenParam {
    return this.replace(target, new KtCodegenParam());
  }

  /**
   * 校验并写出旧 C++/Qt 可读取的 v4 JSON 文本。
   *
   * 发生结构性错误时返回 `value: null`；未知 Combo 字符串不属于结构性错误，
   * 会按原值写出。
   */
  writeJson(
    param: KtCodegenParam,
    space = 4,
    rootKeys: readonly string[] = [],
  ): KtCodegenDataResult<string> {
    const diagnostics = ktCodegenValidateParam(param);
    if (ktCodegenHasDiagnosticErrors(diagnostics)) {
      return { ok: false, value: null, diagnostics };
    }
    return {
      ok: true,
      value: ktCodegenWriteLegacyV4Json(param, space, rootKeys),
      diagnostics,
    };
  }

  /**
   * 校验并写出旧17列 CSV。
   *
   * 默认采用兼容旧 Qt `split(',')` 的简单方言，也可由 options 选择 RFC 4180。
   * 写出结果中的 warning 用于提示简单方言可能发生的逗号或换行替换。
   */
  writeCsv(
    param: KtCodegenParam,
    options: KtCodegenLegacyCsvWriteOptions = {},
  ): KtCodegenDataResult<string> {
    const validationDiagnostics = ktCodegenValidateParam(param);
    if (ktCodegenHasDiagnosticErrors(validationDiagnostics)) {
      return { ok: false, value: null, diagnostics: validationDiagnostics };
    }

    const result = ktCodegenWriteLegacyCsv(param, options);
    return {
      ...result,
      diagnostics: [...validationDiagnostics, ...result.diagnostics],
    };
  }
}
