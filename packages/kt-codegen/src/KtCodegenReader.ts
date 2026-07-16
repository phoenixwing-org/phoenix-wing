// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenDataResult } from "./model/diagnostic.js";
import { ktCodegenParseLegacyCsv } from "./legacy/csv.js";
import { ktCodegenParseLegacyV4Json } from "./legacy/v4-json.js";
import type { KtCodegenParam } from "./KtCodegenParam.js";

/**
 * CSV/JSON 输入边界。
 *
 * Reader 把旧配置解析成新的临时 `KtCodegenParam`，不持有共享状态，也不会
 * 直接修改 Controller 的共享实例。是否应用读取结果由 Controller 决定。
 */
export class KtCodegenReader {
  /**
   * 读取旧 v4 JSON 字符串或已经解析的对象。
   *
   * 保留未知根字段和列表外字符串；协议、列类型或必填字段问题通过诊断返回。
   */
  readJson(input: string | unknown): KtCodegenDataResult<KtCodegenParam> {
    return ktCodegenParseLegacyV4Json(input);
  }

  /**
   * 读取旧17列 CSV。
   *
   * 同时兼容旧 Qt 简单 CSV 和 RFC 4180 引号；不会自动清空未知 Combo 字符串。
   */
  readCsv(text: string): KtCodegenDataResult<KtCodegenParam> {
    return ktCodegenParseLegacyCsv(text);
  }
}
