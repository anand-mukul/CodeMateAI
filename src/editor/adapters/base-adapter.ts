import { EditorAdapter, EditorStatus, InsertionMode, InsertionResult } from '../../types/editor';

export abstract class BaseEditorAdapter implements EditorAdapter {
  abstract detect(): boolean;
  abstract getValue(): string;
  abstract insertText(code: string, mode?: InsertionMode): InsertionResult | Promise<InsertionResult>;
  abstract focus(): void;
  abstract getSelection(): { start: unknown; end: unknown; text?: string } | null;
  abstract getStatus(): EditorStatus;
  undo?(): boolean;
  redo?(): boolean;
}
