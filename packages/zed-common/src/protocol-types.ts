/**
 * JSON-RPC 2.0 protocol types for Cursorless-Zed communication
 */

export const JSONRPC_VERSION = "2.0" as const;
export const PROTOCOL_VERSION = "1.0.0" as const;

// ============================================================================
// Core JSON-RPC Types
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params: unknown;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcResponse
  | JsonRpcNotification;

// ============================================================================
// Position and Range Types
// ============================================================================

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Selection {
  anchor: Position;
  active: Position;
}

// ============================================================================
// Token and Hat Types
// ============================================================================

export interface Token {
  text: string;
  range: Range;
}

export interface HatStyle {
  shape: string;
  color: string;
}

export interface HatAllocation {
  tokenIndex: number;
  hatStyle: HatStyle;
  grapheme: string;
}

// ============================================================================
// Editor State Types
// ============================================================================

export interface EditorState {
  documentUri: string;
  cursorPosition: Position;
  selections: Selection[];
  visibleRange?: Range;
}

export type FocusedElementType = "textEditor" | "terminal" | "other";

// ============================================================================
// Request Parameter Types
// ============================================================================

export interface InitializeParams {
  protocolVersion: string;
  editorName: string;
  capabilities: EditorCapabilities;
}

export interface EditorCapabilities {
  decorations: boolean;
  multiCursor: boolean;
}

export interface GetHatAllocationsParams {
  editorId: string;
  documentUri: string;
  visibleRange: Range;
  tokens: Token[];
}

export interface ExecuteCommandParams {
  commandId: string;
  args: unknown[];
  editorState: EditorState;
}

export interface UpdateEditorStateParams {
  editorId: string;
  documentUri: string;
  cursorPosition: Position;
  selections: Selection[];
  visibleRange?: Range;
}

export interface DocumentChangedParams {
  documentUri: string;
  version: number;
  changes: TextDocumentContentChangeEvent[];
}

export interface TextDocumentContentChangeEvent {
  range: Range;
  text: string;
}

export interface ClearHatsParams {
  editorId: string;
}

export interface PrePhraseSignalParams {
  timestamp: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetFocusedElementTypeParams {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShutdownParams {}

// ============================================================================
// Response Result Types
// ============================================================================

export interface InitializeResult {
  protocolVersion: string;
  engineVersion: string;
  capabilities: EngineCapabilities;
}

export interface EngineCapabilities {
  hatStyles: number;
  customCommands: boolean;
}

export interface GetHatAllocationsResult {
  hats: HatAllocation[];
}

export interface ExecuteCommandResult {
  returnValue?: unknown;
  thatMark?: unknown[];
  sourceMark?: unknown[];
}

export interface GetFocusedElementTypeResult {
  elementType: FocusedElementType;
}

export type ShutdownResult = null;

// ============================================================================
// Error Code Constants
// ============================================================================

/* eslint-disable @typescript-eslint/naming-convention */
export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  ENGINE_NOT_INITIALIZED: -32000,
  INVALID_EDITOR_STATE: -32001,
  COMMAND_EXECUTION_FAILED: -32002,
  TOKEN_NOT_FOUND: -32003,
  HAT_ALLOCATION_FAILED: -32004,
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Validation Helpers
// ============================================================================

export function isJsonRpcRequest(msg: unknown): msg is JsonRpcRequest {
  if (typeof msg !== "object" || msg == null) {
    return false;
  }
  const obj = msg as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" &&
    typeof obj.id === "number" &&
    typeof obj.method === "string" &&
    "params" in obj
  );
}

export function isJsonRpcResponse(msg: unknown): msg is JsonRpcResponse {
  if (typeof msg !== "object" || msg == null) {
    return false;
  }
  const obj = msg as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" &&
    typeof obj.id === "number" &&
    ("result" in obj || "error" in obj)
  );
}

export function isJsonRpcNotification(
  msg: unknown
): msg is JsonRpcNotification {
  if (typeof msg !== "object" || msg == null) {
    return false;
  }
  const obj = msg as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" &&
    !("id" in obj) &&
    typeof obj.method === "string" &&
    "params" in obj
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createRequest(
  id: number,
  method: string,
  params: unknown
): JsonRpcRequest {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    method,
    params,
  };
}

export function createSuccessResponse(
  id: number,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    result,
  };
}

export function createErrorResponse(
  id: number,
  error: JsonRpcError
): JsonRpcResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    error,
  };
}

export function createNotification(
  method: string,
  params: unknown
): JsonRpcNotification {
  return {
    jsonrpc: JSONRPC_VERSION,
    method,
    params,
  };
}

export function createError(
  code: ErrorCode,
  message: string,
  data?: unknown
): JsonRpcError {
  return {
    code,
    message,
    data,
  };
}

// ============================================================================
// Error Constructors
// ============================================================================

export const JsonRpcErrors = {
  parseError(): JsonRpcError {
    return createError(ErrorCodes.PARSE_ERROR, "Parse error");
  },

  invalidRequest(): JsonRpcError {
    return createError(ErrorCodes.INVALID_REQUEST, "Invalid Request");
  },

  methodNotFound(method: string): JsonRpcError {
    return createError(
      ErrorCodes.METHOD_NOT_FOUND,
      `Method not found: ${method}`
    );
  },

  invalidParams(message: string): JsonRpcError {
    return createError(ErrorCodes.INVALID_PARAMS, message);
  },

  internalError(message: string): JsonRpcError {
    return createError(ErrorCodes.INTERNAL_ERROR, message);
  },

  engineNotInitialized(): JsonRpcError {
    return createError(
      ErrorCodes.ENGINE_NOT_INITIALIZED,
      "Engine not initialized. Call 'initialize' first."
    );
  },

  invalidEditorState(message: string): JsonRpcError {
    return createError(ErrorCodes.INVALID_EDITOR_STATE, message);
  },

  commandExecutionFailed(message: string, data?: unknown): JsonRpcError {
    return createError(ErrorCodes.COMMAND_EXECUTION_FAILED, message, data);
  },

  tokenNotFound(tokenIndex: number): JsonRpcError {
    return createError(
      ErrorCodes.TOKEN_NOT_FOUND,
      `Token at index ${tokenIndex} not found`
    );
  },

  hatAllocationFailed(message: string): JsonRpcError {
    return createError(ErrorCodes.HAT_ALLOCATION_FAILED, message);
  },
};
