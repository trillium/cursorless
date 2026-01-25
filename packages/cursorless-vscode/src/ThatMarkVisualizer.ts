import type { Disposable } from "@cursorless/common";
import { groupBy, toCharacterRange } from "@cursorless/common";
import type { StoredTargetMap } from "@cursorless/cursorless-engine";
import type {
  ScopeRangeType,
  ScopeVisualizerColorConfig,
} from "@cursorless/vscode-common";
import type { VscodeIDE } from "./ide/vscode/VscodeIDE";
import { VscodeFancyRangeHighlighter } from "./ide/vscode/VSCodeScopeVisualizer/VscodeFancyRangeHighlighter";
import { getColorsFromConfig } from "./ide/vscode/VSCodeScopeVisualizer/getColorsFromConfig";
import { vscodeApi } from "./vscodeApi";

/**
 * Visualizer for the "that" mark. Can be toggled on/off via commands.
 */
export class ThatMarkVisualizer implements Disposable {
  private highlighter?: VscodeFancyRangeHighlighter;
  private storedTargetsDisposable?: Disposable;
  private configDisposable?: Disposable;
  private isActive = false;

  constructor(
    private ide: VscodeIDE,
    private storedTargets: StoredTargetMap,
  ) {}

  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.initialize();
  }

  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.cleanup();
  }

  private initialize(): void {
    const colorConfig = vscodeApi.workspace
      .getConfiguration("cursorless.scopeVisualizer")
      .get<ScopeVisualizerColorConfig>("colors")!;

    const rangeType: ScopeRangeType = "content";
    this.highlighter = new VscodeFancyRangeHighlighter(
      getColorsFromConfig(colorConfig, rangeType),
    );

    // Listen for color config changes
    this.configDisposable = vscodeApi.workspace.onDidChangeConfiguration(
      ({ affectsConfiguration }) => {
        if (
          this.isActive &&
          affectsConfiguration("cursorless.scopeVisualizer.colors")
        ) {
          this.cleanup();
          this.initialize();
        }
      },
    );

    // Listen for changes to the "that" mark
    this.storedTargetsDisposable = this.storedTargets.onStoredTargets(
      (key, targets) => {
        if (key !== "that" || !this.isActive) {
          return;
        }

        const editorRangeMap = groupBy(
          targets ?? [],
          ({ editor }) => editor.id,
        );

        this.ide.visibleTextEditors.forEach((editor) => {
          this.highlighter!.setRanges(
            editor,
            (editorRangeMap.get(editor.id) ?? []).map(({ contentRange }) =>
              toCharacterRange(contentRange),
            ),
          );
        });
      },
    );
  }

  private cleanup(): void {
    this.highlighter?.dispose();
    this.highlighter = undefined;
    this.storedTargetsDisposable?.dispose();
    this.storedTargetsDisposable = undefined;
    this.configDisposable?.dispose();
    this.configDisposable = undefined;
  }

  dispose(): void {
    this.cleanup();
  }
}
