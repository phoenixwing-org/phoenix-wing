// SPDX-License-Identifier: Apache-2.0

import {
  KT_CODEGEN_LEGACY_BLOCKS,
  type KtCodegenBlockKey,
} from "./blocks/legacy-blocks.js";
import type {
  KtCodegenSnapshot,
  KtCodegenSourceFileSnapshot,
} from "./api/contracts.js";
import type { KtCodegenDiagnostic } from "./model/diagnostic.js";
import type { KtCodegenParam } from "./KtCodegenParam.js";

const KT_CODEGEN_MARKER_START = "START KEVIN CAA WIZARD SECTION";
const KT_CODEGEN_MARKER_END = "END KEVIN CAA WIZARD SECTION";

/** 自动代码控制标记的开始或结束种类。 */
export type KtCodegenMarkerKind = "start" | "end";

/** 源文件中一个已识别的旧 Kevin 自动代码控制标记。 */
export interface KtCodegenMarkerPoint {
  /** 标记是自动代码块的开始还是结束。 */
  readonly kind: KtCodegenMarkerKind;
  /** 标记所在文件的宿主路径。 */
  readonly path: string;
  /** `NamePrefix + NameMiddle + NameSuffix` 组成的旧类身份。 */
  readonly classId: string;
  /** 从类身份反查出的参数 `NameSuffix`。 */
  readonly nameSuffix: string;
  /** 32个旧自动代码块之一的稳定 key。 */
  readonly blockKey: KtCodegenBlockKey;
  /** 从0开始的标记所在行号。 */
  readonly line: number;
  /** 从0开始的 `START` 或 `END` 所在列号。 */
  readonly column: number;
  /** 当前整行在文件文本中的起始偏移。 */
  readonly lineStartOffset: number;
  /** 当前整行及其换行符之后的偏移；末行无换行时等于文本长度。 */
  readonly lineEndOffset: number;
  /** `START` 或 `END` 第一个字符在文件文本中的偏移。 */
  readonly markerStartOffset: number;
  /** block key 最后一个字符之后、行尾空白之前的偏移。 */
  readonly markerEndOffset: number;
  /** 不含注释符和行尾空白的控制标记文本。 */
  readonly text: string;
  /** 旧 VB 从控制标记前最后一个 `//` 之前提取的代码缩进前缀。 */
  readonly linePrefix: string;
}

/** 一对可安全定位的旧自动代码 Start/End 标记及其替换范围。 */
export interface KtCodegenMarkerRegion {
  /** 当前 Analyze Plan 内稳定关联 artifact 的区域身份。 */
  readonly id: string;
  /** 标记所在文件的宿主路径。 */
  readonly path: string;
  /** 扫描时文件内容指纹，供 Apply 前并发检查。 */
  readonly sourceFingerprint: string;
  /** 当前自动代码块对应的旧类身份。 */
  readonly classId: string;
  /** 当前自动代码块对应的参数后缀。 */
  readonly nameSuffix: string;
  /** 当前自动代码块的稳定 key。 */
  readonly blockKey: KtCodegenBlockKey;
  /** 已配对的开始标记。 */
  readonly start: KtCodegenMarkerPoint;
  /** 已配对的结束标记。 */
  readonly end: KtCodegenMarkerPoint;
  /** 旧块内容起始偏移，即 Start 标记整行之后。 */
  readonly bodyStartOffset: number;
  /** 旧块内容结束偏移，即 End 标记整行之前。 */
  readonly bodyEndOffset: number;
  /** 整块替换起始偏移，包含 Start 标记所在整行。 */
  readonly replaceStartOffset: number;
  /** 整块替换结束偏移，包含 End 标记所在整行及已有换行符。 */
  readonly replaceEndOffset: number;
}

/** 一次只读源码标记扫描的结果。 */
export interface KtCodegenMarkerScanResult {
  /** 结构完整且没有错配风险的标记区域。 */
  readonly regions: readonly KtCodegenMarkerRegion[];
  /** 孤立、缺失、错配或格式异常标记的结构化诊断。 */
  readonly diagnostics: readonly KtCodegenDiagnostic[];
}

interface KtCodegenSourceLine {
  readonly number: number;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

interface KtCodegenParsedMarker {
  readonly kind: KtCodegenMarkerKind;
  readonly classId: string;
  /** 标记协议中的块区分词；只有已归档的32项才会进入生成计划。 */
  readonly blockKey: string;
  readonly line: KtCodegenSourceLine;
  readonly column: number;
  readonly markerEndColumn: number;
  readonly text: string;
  readonly linePrefix: string;
}

interface KtCodegenOpenMarker {
  readonly marker: KtCodegenMarkerPoint;
  invalid: boolean;
}

interface KtCodegenMarkerLineParseResult {
  readonly marker: KtCodegenParsedMarker | null;
  readonly diagnostic: KtCodegenDiagnostic | null;
}

function isArchivedBlockKey(value: string): value is KtCodegenBlockKey {
  return KT_CODEGEN_LEGACY_BLOCKS.some((block) => block.key === value);
}

/**
 * 旧 Kevin 自动代码控制标记的构造与只读扫描器。
 *
 * 本类复现 `KevinCAAFileGuide` 的 `START/END KEVIN CAA WIZARD SECTION`
 * 文本协议和缩进提取规则，但不生成业务代码、不修改源码，也不写文件。
 * 控制块严格同级、不允许嵌套；对旧实现会静默吞掉的缺失、错配和孤立标记，
 * 本类返回明确 error 诊断并在下一处语法完整的 Start 恢复扫描。
 */
export class KtCodegenMarker {
  /** 根据共享参数和后缀创建旧标记使用的类身份。 */
  public createClassId(param: KtCodegenParam, nameSuffix: string): string {
    return `${param.namePrefix}${param.nameMiddle}${nameSuffix}`;
  }

  /**
   * 创建包含 `//` 的旧格式 Start 标记整行。
   *
   * `linePrefix` 对应旧 VB `_prefix`，通常是空字符串、空格或制表符缩进。
   */
  public createStart(
    param: KtCodegenParam,
    nameSuffix: string,
    blockKey: KtCodegenBlockKey,
    linePrefix = "",
  ): string {
    return `${linePrefix}// ${KT_CODEGEN_MARKER_START} ${this.createClassId(param, nameSuffix)} ${blockKey}`;
  }

  /**
   * 创建包含 `//` 的旧格式 End 标记整行。
   *
   * `linePrefix` 对应旧 VB `_prefix`，应与配对 Start 使用相同前缀。
   */
  public createEnd(
    param: KtCodegenParam,
    nameSuffix: string,
    blockKey: KtCodegenBlockKey,
    linePrefix = "",
  ): string {
    return `${linePrefix}// ${KT_CODEGEN_MARKER_END} ${this.createClassId(param, nameSuffix)} ${blockKey}`;
  }

  /**
   * 扫描宿主提供的不可变源码快照，返回可安全替换的旧自动代码区域。
   *
   * 扫描仅匹配当前 Param 中出现的 `NameSuffix` 和调用者允许的 block key。
   * 其他类或未请求 block 的合法标记保持不变，便于同一文件容纳多套生成数据。
   */
  public scan(
    param: KtCodegenParam,
    snapshot: KtCodegenSnapshot,
    blockKeys: readonly KtCodegenBlockKey[] = KT_CODEGEN_LEGACY_BLOCKS.map(
      (block) => block.key,
    ),
  ): KtCodegenMarkerScanResult {
    const expectedClassIds = new Map<string, string>();
    for (const item of param.items) {
      const classId = this.createClassId(param, item.nameSuffix);
      if (!expectedClassIds.has(classId)) expectedClassIds.set(classId, item.nameSuffix);
    }

    const requestedBlocks = new Set<KtCodegenBlockKey>(blockKeys);
    const regions: KtCodegenMarkerRegion[] = [];
    const diagnostics: KtCodegenDiagnostic[] = [];
    for (const file of snapshot.files) {
      this.scanFile(file, expectedClassIds, requestedBlocks, regions, diagnostics);
    }
    return { regions, diagnostics };
  }

  /** 顺序扫描单个文件，并保持旧实现一次只处理一个打开块的基本模型。 */
  private scanFile(
    file: KtCodegenSourceFileSnapshot,
    expectedClassIds: ReadonlyMap<string, string>,
    requestedBlocks: ReadonlySet<KtCodegenBlockKey>,
    regions: KtCodegenMarkerRegion[],
    diagnostics: KtCodegenDiagnostic[],
  ): void {
    let open: KtCodegenOpenMarker | null = null;
    for (const line of this.splitLines(file.text)) {
      const parsed = this.parseLine(file.path, line);
      if (parsed.diagnostic) {
        diagnostics.push(parsed.diagnostic);
        if (open) open.invalid = true;
      }
      if (!parsed.marker) continue;

      let marker: KtCodegenMarkerPoint | null = null;
      if (
        isArchivedBlockKey(parsed.marker.blockKey) &&
        requestedBlocks.has(parsed.marker.blockKey)
      ) {
        const nameSuffix = expectedClassIds.get(parsed.marker.classId);
        if (nameSuffix !== undefined) {
          const knownMarker = {
            ...parsed.marker,
            blockKey: parsed.marker.blockKey,
          } as KtCodegenParsedMarker & { readonly blockKey: KtCodegenBlockKey };
          marker = this.toMarkerPoint(file.path, knownMarker, nameSuffix);
        }
      }

      // Kevin 控制块严格同级、不允许嵌套。任何下一条语法完整 marker 都是当前
      // 打开块的边界；只有身份完全匹配的 End 能闭合它。Start 或错配 End 都先
      // 终止旧状态，避免一个手误向文件后部级联出 nested/mismatched 诊断。
      if (open) {
        if (parsed.marker.kind === "start") {
          diagnostics.push(this.missingEndDiagnostic(file.path, open, parsed.marker));
          open = null;
        } else if (
          !marker ||
          open.marker.classId !== marker.classId ||
          open.marker.blockKey !== marker.blockKey
        ) {
          diagnostics.push(this.missingEndDiagnostic(file.path, open, parsed.marker));
          open = null;
          if (marker) diagnostics.push(this.orphanEndDiagnostic(marker));
          continue;
        } else {
          if (!open.invalid) {
            regions.push({
              id: `${file.path}:${open.marker.lineStartOffset}:${marker.lineEndOffset}`,
              path: file.path,
              sourceFingerprint: file.fingerprint,
              classId: marker.classId,
              nameSuffix: marker.nameSuffix,
              blockKey: marker.blockKey,
              start: open.marker,
              end: marker,
              bodyStartOffset: open.marker.lineEndOffset,
              bodyEndOffset: marker.lineStartOffset,
              replaceStartOffset: open.marker.lineStartOffset,
              replaceEndOffset: marker.lineEndOffset,
            });
          }
          open = null;
          continue;
        }
      }

      // 未请求 block 和其他类的 marker 也能切断旧 open，但其自身保持静默，
      // 避免一次局部扫描把未选择的正常控制块误报为孤立标记。
      if (!marker) continue;
      if (marker.kind === "start") {
        open = { marker, invalid: false };
      } else {
        diagnostics.push(this.orphanEndDiagnostic(marker));
      }
    }

    if (open) {
      diagnostics.push(
        this.sourceDiagnostic(
          "marker.missing-end",
          "error",
          `Start marker ${open.marker.classId} ${open.marker.blockKey} has no matching End marker.`,
          file.path,
          open.marker.line,
          open.marker.column,
        ),
      );
    }
  }

  /** 在旧 Start 位置报告其直到下一条完整 marker 仍未闭合。 */
  private missingEndDiagnostic(
    path: string,
    open: KtCodegenOpenMarker,
    boundary: KtCodegenParsedMarker,
  ): KtCodegenDiagnostic {
    const boundaryKind = boundary.kind === "start" ? "Start" : "End";
    return this.sourceDiagnostic(
      "marker.missing-end",
      "error",
      `Start marker ${open.marker.classId} ${open.marker.blockKey} has no matching End marker before ${boundaryKind} marker at line ${boundary.line.number + 1}.`,
      path,
      open.marker.line,
      open.marker.column,
    );
  }

  /** 把没有可闭合 open 的已选 End 作为独立错误定位。 */
  private orphanEndDiagnostic(marker: KtCodegenMarkerPoint): KtCodegenDiagnostic {
    return this.sourceDiagnostic(
      "marker.orphan-end",
      "error",
      `End marker ${marker.classId} ${marker.blockKey} has no preceding Start marker.`,
      marker.path,
      marker.line,
      marker.column,
    );
  }

  /** 将文件文本拆成保留精确绝对偏移的逻辑行。 */
  private splitLines(text: string): readonly KtCodegenSourceLine[] {
    const lines: KtCodegenSourceLine[] = [];
    let startOffset = 0;
    let number = 0;
    while (startOffset < text.length) {
      let newlineOffset = startOffset;
      while (
        newlineOffset < text.length &&
        text[newlineOffset] !== "\r" &&
        text[newlineOffset] !== "\n"
      ) {
        newlineOffset += 1;
      }
      let endOffset = newlineOffset;
      if (newlineOffset < text.length) {
        endOffset =
          text[newlineOffset] === "\r" && text[newlineOffset + 1] === "\n"
            ? newlineOffset + 2
            : newlineOffset + 1;
      }
      lines.push({
        number,
        text: text.slice(startOffset, newlineOffset),
        startOffset,
        endOffset,
      });
      startOffset = endOffset;
      number += 1;
    }
    return lines;
  }

  /** 解析单行中的旧标记；普通源码行返回空结果。 */
  private parseLine(path: string, line: KtCodegenSourceLine): KtCodegenMarkerLineParseResult {
    const startColumn = line.text.indexOf(KT_CODEGEN_MARKER_START);
    const endColumn = line.text.indexOf(KT_CODEGEN_MARKER_END);
    if (startColumn < 0 && endColumn < 0) return { marker: null, diagnostic: null };

    if (startColumn >= 0 && endColumn >= 0) {
      return {
        marker: null,
        diagnostic: this.sourceDiagnostic(
          "marker.ambiguous-line",
          "error",
          "One source line contains both Start and End Kevin markers.",
          path,
          line.number,
          Math.min(startColumn, endColumn),
        ),
      };
    }

    const kind: KtCodegenMarkerKind = startColumn >= 0 ? "start" : "end";
    const column = kind === "start" ? startColumn : endColumn;
    const label = kind === "start" ? KT_CODEGEN_MARKER_START : KT_CODEGEN_MARKER_END;
    const payloadColumn = column + label.length;
    if (line.text[payloadColumn] !== " ") {
      return {
        marker: null,
        diagnostic: this.sourceDiagnostic(
          "marker.malformed",
          "error",
          "Kevin marker must contain one space before its class identity.",
          path,
          line.number,
          column,
        ),
      };
    }

    const payloadStartColumn = payloadColumn + 1;
    const payload = line.text.slice(payloadStartColumn).trimEnd();
    const separatorColumn = payload.indexOf(" ");
    if (separatorColumn < 1 || separatorColumn === payload.length - 1) {
      return {
        marker: null,
        diagnostic: this.sourceDiagnostic(
          "marker.malformed-payload",
          "error",
          "Kevin marker must contain a class identity followed by a block discriminator.",
          path,
          line.number,
          column,
        ),
      };
    }

    const classId = payload.slice(0, separatorColumn);
    const blockKey = payload.slice(separatorColumn + 1).trim();

    const beforeMarker = line.text.slice(0, column);
    const commentColumn = beforeMarker.lastIndexOf("//");
    const linePrefix = commentColumn >= 0 ? beforeMarker.slice(0, commentColumn) : "";
    const markerEndColumn = payloadStartColumn + payload.length;
    return {
      marker: {
        kind,
        classId,
        blockKey,
        line,
        column,
        markerEndColumn,
        text: line.text.slice(column, markerEndColumn),
        linePrefix,
      },
      diagnostic: null,
    };
  }

  /** 将内部解析记录转换为公开、可审计的绝对定位结构。 */
  private toMarkerPoint(
    path: string,
    marker: KtCodegenParsedMarker & { readonly blockKey: KtCodegenBlockKey },
    nameSuffix: string,
  ): KtCodegenMarkerPoint {
    return {
      kind: marker.kind,
      path,
      classId: marker.classId,
      nameSuffix,
      blockKey: marker.blockKey,
      line: marker.line.number,
      column: marker.column,
      lineStartOffset: marker.line.startOffset,
      lineEndOffset: marker.line.endOffset,
      markerStartOffset: marker.line.startOffset + marker.column,
      markerEndOffset: marker.line.startOffset + marker.markerEndColumn,
      text: marker.text,
      linePrefix: marker.linePrefix,
    };
  }

  /** 创建带文件、行、列定位的源码诊断。 */
  private sourceDiagnostic(
    code: string,
    severity: "error" | "warning",
    message: string,
    file: string,
    row: number,
    column: number,
  ): KtCodegenDiagnostic {
    return {
      code,
      severity,
      message,
      path: { source: "source", file, row, column },
    };
  }
}
