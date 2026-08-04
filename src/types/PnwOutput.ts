/** Output 是单一自由文本流；格式、前缀与换行完全由 consumer 决定。 */
export interface PnwOutputSnapshot {
  readonly text: string;
  readonly revision: number;
}

export type PnwOutputSignal =
  | { readonly type: "append"; readonly value: string }
  | { readonly type: "appendLine"; readonly value: string }
  | { readonly type: "replace"; readonly value: string }
  | { readonly type: "clear" };

export type PnwOutputListener = (snapshot: PnwOutputSnapshot) => void;

export interface PnwOutputBuffer {
  readonly getSnapshot: () => PnwOutputSnapshot;
  readonly dispatch: (signal: PnwOutputSignal) => void;
  readonly subscribe: (listener: PnwOutputListener) => () => void;
}

export interface PnwOutputBufferOptions {
  readonly initialText?: string;
  readonly maxCharacters?: number;
}
