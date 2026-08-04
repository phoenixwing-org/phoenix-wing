import type {
  PnwOutputBuffer,
  PnwOutputBufferOptions,
  PnwOutputSnapshot,
} from "../types/PnwOutput.js";

export const PNW_DEFAULT_OUTPUT_MAX_CHARACTERS = 200_000;
export const PNW_OUTPUT_MAX_CHARACTERS_LIMIT = 2_000_000;

function pnwOutputMaxCharacters(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return PNW_DEFAULT_OUTPUT_MAX_CHARACTERS;
  }
  return Math.min(PNW_OUTPUT_MAX_CHARACTERS_LIMIT, Math.max(1, Math.trunc(value)));
}

function pnwOutputText(value: string, maxCharacters: number): string {
  return value.length <= maxCharacters ? value : value.slice(-maxCharacters);
}

function pnwOutputSnapshot(text: string, revision: number): PnwOutputSnapshot {
  return Object.freeze({ text, revision });
}

/**
 * 创建与单个工作台实例绑定的有界 Output 文本流。
 *
 * API 对齐 VS Code OutputChannel 的 append / appendLine / replace / clear 语义，
 * 但不创建全局频道、Router、持久化或业务日志模型。
 */
export function pnwCreateOutputBuffer(
  options: PnwOutputBufferOptions = {},
): PnwOutputBuffer {
  const maxCharacters = pnwOutputMaxCharacters(options.maxCharacters);
  const listeners = new Set<(snapshot: PnwOutputSnapshot) => void>();
  let snapshot = pnwOutputSnapshot(
    pnwOutputText(options.initialText ?? "", maxCharacters),
    0,
  );

  function publish(text: string): void {
    const nextText = pnwOutputText(text, maxCharacters);
    if (nextText === snapshot.text) return;
    snapshot = pnwOutputSnapshot(nextText, snapshot.revision + 1);
    for (const listener of listeners) listener(snapshot);
  }

  return {
    getSnapshot: () => snapshot,
    dispatch: (signal) => {
      switch (signal.type) {
        case "append":
          if (signal.value) publish(snapshot.text + signal.value);
          break;
        case "appendLine":
          publish(`${snapshot.text}${signal.value}\n`);
          break;
        case "replace":
          publish(signal.value);
          break;
        case "clear":
          publish("");
          break;
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
