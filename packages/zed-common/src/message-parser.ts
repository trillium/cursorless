/**
 * JSON-RPC message parser for stdio-based communication
 */

import {
  type JsonRpcMessage,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcNotification,
  isJsonRpcRequest,
  isJsonRpcResponse,
  isJsonRpcNotification,
  JsonRpcErrors,
} from './protocol-types';

export interface ParseResult {
  success: true;
  message: JsonRpcMessage;
}

export interface ParseError {
  success: false;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type ParsedMessage = ParseResult | ParseError;

/**
 * Parse a single line of JSON into a JSON-RPC message
 */
export function parseMessage(line: string): ParsedMessage {
  // Remove trailing newline if present
  const trimmed = line.trim();

  if (trimmed === '') {
    return {
      success: false,
      error: JsonRpcErrors.parseError(),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (_err) {
    return {
      success: false,
      error: JsonRpcErrors.parseError(),
    };
  }

  // Validate it's a valid JSON-RPC message
  if (
    isJsonRpcRequest(parsed) ||
    isJsonRpcResponse(parsed) ||
    isJsonRpcNotification(parsed)
  ) {
    return {
      success: true,
      message: parsed,
    };
  }

  return {
    success: false,
    error: JsonRpcErrors.invalidRequest(),
  };
}

/**
 * Serialize a JSON-RPC message to a single line
 */
export function serializeMessage(message: JsonRpcMessage): string {
  return JSON.stringify(message) + '\n';
}

/**
 * Type guard to check if parsed message is a request
 */
export function isRequest(
  result: ParsedMessage
): result is ParseResult & { message: JsonRpcRequest } {
  return result.success && isJsonRpcRequest(result.message);
}

/**
 * Type guard to check if parsed message is a response
 */
export function isResponse(
  result: ParsedMessage
): result is ParseResult & { message: JsonRpcResponse } {
  return result.success && isJsonRpcResponse(result.message);
}

/**
 * Type guard to check if parsed message is a notification
 */
export function isNotification(
  result: ParsedMessage
): result is ParseResult & { message: JsonRpcNotification } {
  return result.success && isJsonRpcNotification(result.message);
}

/**
 * Line buffering for incomplete messages
 */
export class LineBuffer {
  private buffer = '';

  /**
   * Add data to the buffer and extract complete lines
   */
  public push(data: string): string[] {
    this.buffer += data;
    const lines: string[] = [];

    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      lines.push(line);
      this.buffer = this.buffer.slice(newlineIndex + 1);
    }

    return lines;
  }

  /**
   * Get any remaining buffered data
   */
  public remaining(): string {
    return this.buffer;
  }

  /**
   * Clear the buffer
   */
  public clear(): void {
    this.buffer = '';
  }

  /**
   * Check if buffer has data
   */
  public hasData(): boolean {
    return this.buffer.length > 0;
  }
}

/**
 * Message stream processor
 * Handles line buffering and message parsing
 */
export class MessageStream {
  private lineBuffer = new LineBuffer();

  /**
   * Process incoming data and yield parsed messages
   */
  public *process(data: string): Generator<ParsedMessage> {
    const lines = this.lineBuffer.push(data);

    for (const line of lines) {
      yield parseMessage(line);
    }
  }

  /**
   * Get remaining buffered data
   */
  public getRemaining(): string {
    return this.lineBuffer.remaining();
  }

  /**
   * Clear the stream
   */
  public clear(): void {
    this.lineBuffer.clear();
  }
}
