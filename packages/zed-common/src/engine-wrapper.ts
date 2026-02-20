/**
 * Main engine wrapper for Cursorless-Zed communication
 */

import * as readline from 'node:readline';
import {
  PROTOCOL_VERSION,
  type InitializeParams,
  type InitializeResult,
  type GetHatAllocationsParams,
  type GetHatAllocationsResult,
  type ExecuteCommandParams,
  type ExecuteCommandResult,
  type GetFocusedElementTypeResult,
  type ShutdownParams,
  type ShutdownResult,
  type UpdateEditorStateParams,
  type DocumentChangedParams,
  type ClearHatsParams,
  type PrePhraseSignalParams,
  type FocusedElementType,
  JsonRpcErrors,
} from './protocol-types';
import { MessageStream, serializeMessage, isRequest, isNotification } from './message-parser';
import { MethodHandlerRegistry } from './method-handlers';

export interface EngineWrapperConfig {
  /**
   * Version of the Cursorless engine
   */
  engineVersion: string;

  /**
   * Input stream (default: process.stdin)
   */
  input?: NodeJS.ReadableStream;

  /**
   * Output stream (default: process.stdout)
   */
  output?: NodeJS.WritableStream;

  /**
   * Error stream for logging (default: process.stderr)
   */
  errorStream?: NodeJS.WritableStream;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

export class EngineWrapper {
  private readonly config: Required<EngineWrapperConfig>;
  private readonly registry = new MethodHandlerRegistry();
  private readonly messageStream = new MessageStream();
  private initialized = false;
  private shutdownRequested = false;
  private focusedElementType: FocusedElementType = 'textEditor';

  constructor(config: EngineWrapperConfig) {
    this.config = {
      engineVersion: config.engineVersion,
      input: config.input ?? process.stdin,
      output: config.output ?? process.stdout,
      errorStream: config.errorStream ?? process.stderr,
      debug: config.debug ?? false,
    };

    this.setupHandlers();
  }

  /**
   * Start the engine wrapper
   */
  public async start(): Promise<void> {
    this.log('Starting Cursorless engine wrapper');
    this.log(`Engine version: ${this.config.engineVersion}`);
    this.log(`Protocol version: ${PROTOCOL_VERSION}`);

    const rl = readline.createInterface({
      input: this.config.input,
      output: undefined,
      terminal: false,
    });

    for await (const line of rl) {
      if (this.shutdownRequested) {
        break;
      }

      await this.processLine(line + '\n');
    }

    this.log('Engine wrapper stopped');
  }

  /**
   * Process a single line of input
   */
  private async processLine(line: string): Promise<void> {
    const messages = this.messageStream.process(line);

    for (const parsed of messages) {
      if (!parsed.success) {
        this.logError('Parse error:', parsed.error);
        continue;
      }

      if (isRequest(parsed)) {
        const response = await this.registry.handleRequest(parsed.message);
        this.sendMessage(response);
      } else if (isNotification(parsed)) {
        await this.registry.handleNotification(parsed.message);
      } else {
        this.logError('Unexpected message type');
      }
    }
  }

  /**
   * Send a message to stdout
   */
  private sendMessage(message: unknown): void {
    const serialized = serializeMessage(message as any);
    this.config.output.write(serialized);
  }

  /**
   * Log debug message
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      this.config.errorStream.write('[Engine] ' + args.join(' ') + '\n');
    }
  }

  /**
   * Log error message
   */
  private logError(...args: unknown[]): void {
    this.config.errorStream.write('[Engine ERROR] ' + args.join(' ') + '\n');
  }

  /**
   * Setup all protocol method handlers
   */
  private setupHandlers(): void {
    // Lifecycle methods
    this.registry.registerRequest('initialize', (params) =>
      this.handleInitialize(params as InitializeParams)
    );
    this.registry.registerRequest('shutdown', (params) =>
      this.handleShutdown(params as ShutdownParams)
    );

    // Hat management methods
    this.registry.registerRequest('getHatAllocations', (params) =>
      this.handleGetHatAllocations(params as GetHatAllocationsParams)
    );

    // Command execution methods
    this.registry.registerRequest('executeCommand', (params) =>
      this.handleExecuteCommand(params as ExecuteCommandParams)
    );
    this.registry.registerRequest('getFocusedElementType', () =>
      this.handleGetFocusedElementType()
    );

    // Editor state synchronization (notifications)
    this.registry.registerNotification('updateEditorState', (params) =>
      this.handleUpdateEditorState(params as UpdateEditorStateParams)
    );
    this.registry.registerNotification('documentChanged', (params) =>
      this.handleDocumentChanged(params as DocumentChangedParams)
    );
    this.registry.registerNotification('clearHats', (params) =>
      this.handleClearHats(params as ClearHatsParams)
    );
    this.registry.registerNotification('prePhraseSignal', (params) =>
      this.handlePrePhraseSignal(params as PrePhraseSignalParams)
    );
  }

  // ============================================================================
  // Request Handlers
  // ============================================================================

  private handleInitialize(params: InitializeParams): InitializeResult {
    this.log('Initialize request:', JSON.stringify(params));

    if (params.protocolVersion !== PROTOCOL_VERSION) {
      this.log(
        `Warning: Protocol version mismatch. Client: ${params.protocolVersion}, Server: ${PROTOCOL_VERSION}`
      );
    }

    this.initialized = true;

    return {
      protocolVersion: PROTOCOL_VERSION,
      engineVersion: this.config.engineVersion,
      capabilities: {
        hatStyles: 88,
        customCommands: true,
      },
    };
  }

  private handleShutdown(_params: ShutdownParams): ShutdownResult {
    this.log('Shutdown request received');
    this.shutdownRequested = true;
    return null;
  }

  private handleGetHatAllocations(
    params: GetHatAllocationsParams
  ): GetHatAllocationsResult {
    this.ensureInitialized();

    this.log(
      `GetHatAllocations: ${params.tokens.length} tokens in ${params.documentUri}`
    );

    // Stub implementation: Assign sequential hat styles
    // In a real implementation, this would delegate to the Cursorless engine
    const hats = params.tokens.map((token, index) => ({
      tokenIndex: index,
      hatStyle: this.getHatStyleForIndex(index),
      grapheme: token.text.charAt(0).toLowerCase(),
    }));

    return { hats };
  }

  private handleExecuteCommand(
    params: ExecuteCommandParams
  ): ExecuteCommandResult {
    this.ensureInitialized();

    this.log(`ExecuteCommand: ${params.commandId}`);
    this.log(`  Args: ${JSON.stringify(params.args).slice(0, 100)}...`);
    this.log(`  Editor state: ${params.editorState.documentUri}`);

    // Stub implementation
    // In a real implementation, this would delegate to the Cursorless engine
    return {
      returnValue: null,
      thatMark: [],
      sourceMark: undefined,
    };
  }

  private handleGetFocusedElementType(): GetFocusedElementTypeResult {
    return {
      elementType: this.focusedElementType,
    };
  }

  // ============================================================================
  // Notification Handlers
  // ============================================================================

  private handleUpdateEditorState(params: UpdateEditorStateParams): void {
    this.log(
      `UpdateEditorState: ${params.documentUri} at line ${params.cursorPosition.line}`
    );
    // Update internal editor state tracking
    // In a real implementation, this would update the engine's state
  }

  private handleDocumentChanged(params: DocumentChangedParams): void {
    this.log(
      `DocumentChanged: ${params.documentUri} v${params.version}, ${params.changes.length} changes`
    );
    // Update document content in engine
    // In a real implementation, this would update the engine's document model
  }

  private handleClearHats(params: ClearHatsParams): void {
    this.log(`ClearHats: ${params.editorId}`);
    // Clear hat allocations for the editor
    // In a real implementation, this would clear engine state
  }

  private handlePrePhraseSignal(params: PrePhraseSignalParams): void {
    this.log(`PrePhraseSignal: ${params.timestamp}`);
    // Take snapshot for pre-phrase context
    // In a real implementation, this would capture editor state
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw JsonRpcErrors.engineNotInitialized();
    }
  }

  /**
   * Get hat style for token index (stub implementation)
   */
  private getHatStyleForIndex(index: number): { shape: string; color: string } {
    const shapes = ['fox', 'bolt', 'curve', 'wing', 'eye', 'ex', 'frame', 'hole', 'play', 'crosshairs', 'default'];
    const colors = ['blue', 'red', 'green', 'yellow', 'pink', 'userColor1', 'userColor2', 'default'];

    return {
      shape: shapes[index % shapes.length],
      color: colors[Math.floor(index / shapes.length) % colors.length],
    };
  }
}
