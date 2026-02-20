import * as assert from "assert";
import {
  JSONRPC_VERSION,
  PROTOCOL_VERSION,
  ErrorCodes,
  isJsonRpcRequest,
  isJsonRpcResponse,
  isJsonRpcNotification,
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  createError,
  JsonRpcErrors,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcNotification,
  type InitializeParams,
  type GetHatAllocationsParams,
  type HatAllocation,
} from "../protocol-types";

suite("Protocol Constants", () => {
  test("should have correct JSON-RPC version", () => {
    assert.strictEqual(JSONRPC_VERSION, "2.0");
  });

  test("should have correct protocol version", () => {
    assert.strictEqual(PROTOCOL_VERSION, "1.0.0");
  });

  test("should have all required error codes", () => {
    assert.strictEqual(ErrorCodes.PARSE_ERROR, -32700);
    assert.strictEqual(ErrorCodes.INVALID_REQUEST, -32600);
    assert.strictEqual(ErrorCodes.METHOD_NOT_FOUND, -32601);
    assert.strictEqual(ErrorCodes.INVALID_PARAMS, -32602);
    assert.strictEqual(ErrorCodes.INTERNAL_ERROR, -32603);
    assert.strictEqual(ErrorCodes.ENGINE_NOT_INITIALIZED, -32000);
    assert.strictEqual(ErrorCodes.INVALID_EDITOR_STATE, -32001);
    assert.strictEqual(ErrorCodes.COMMAND_EXECUTION_FAILED, -32002);
    assert.strictEqual(ErrorCodes.TOKEN_NOT_FOUND, -32003);
    assert.strictEqual(ErrorCodes.HAT_ALLOCATION_FAILED, -32004);
  });
});

suite("Message Validation", () => {
  suite("isJsonRpcRequest", () => {
    test("should validate valid request", () => {
      const msg: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      };
      assert.strictEqual(isJsonRpcRequest(msg), true);
    });

    test("should reject request without id", () => {
      const msg = {
        jsonrpc: "2.0",
        method: "test",
        params: {},
      };
      assert.strictEqual(isJsonRpcRequest(msg), false);
    });

    test("should reject request without method", () => {
      const msg = {
        jsonrpc: "2.0",
        id: 1,
        params: {},
      };
      assert.strictEqual(isJsonRpcRequest(msg), false);
    });

    test("should reject request without params", () => {
      const msg = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
      };
      assert.strictEqual(isJsonRpcRequest(msg), false);
    });

    test("should reject request with wrong jsonrpc version", () => {
      const msg = {
        jsonrpc: "1.0",
        id: 1,
        method: "test",
        params: {},
      };
      assert.strictEqual(isJsonRpcRequest(msg), false);
    });

    test("should reject non-object values", () => {
      assert.strictEqual(isJsonRpcRequest(null), false);
      assert.strictEqual(isJsonRpcRequest(undefined), false);
      assert.strictEqual(isJsonRpcRequest("string"), false);
      assert.strictEqual(isJsonRpcRequest(123), false);
      assert.strictEqual(isJsonRpcRequest([]), false);
    });
  });

  suite("isJsonRpcResponse", () => {
    test("should validate valid success response", () => {
      const msg: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: { status: "ok" },
      };
      assert.strictEqual(isJsonRpcResponse(msg), true);
    });

    test("should validate valid error response", () => {
      const msg: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
        },
      };
      assert.strictEqual(isJsonRpcResponse(msg), true);
    });

    test("should reject response without result or error", () => {
      const msg = {
        jsonrpc: "2.0",
        id: 1,
      };
      assert.strictEqual(isJsonRpcResponse(msg), false);
    });

    test("should reject response without id", () => {
      const msg = {
        jsonrpc: "2.0",
        result: {},
      };
      assert.strictEqual(isJsonRpcResponse(msg), false);
    });
  });

  suite("isJsonRpcNotification", () => {
    test("should validate valid notification", () => {
      const msg: JsonRpcNotification = {
        jsonrpc: "2.0",
        method: "clearHats",
        params: { editorId: "editor-1" },
      };
      assert.strictEqual(isJsonRpcNotification(msg), true);
    });

    test("should reject notification with id", () => {
      const msg = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
        params: {},
      };
      assert.strictEqual(isJsonRpcNotification(msg), false);
    });

    test("should reject notification without method", () => {
      const msg = {
        jsonrpc: "2.0",
        params: {},
      };
      assert.strictEqual(isJsonRpcNotification(msg), false);
    });
  });
});

suite("Message Creation", () => {
  suite("createRequest", () => {
    test("should create valid request", () => {
      const params: InitializeParams = {
        protocolVersion: "1.0.0",
        editorName: "zed",
        capabilities: {
          decorations: true,
          multiCursor: true,
        },
      };

      const request = createRequest(1, "initialize", params);

      assert.deepStrictEqual(request, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params,
      });
      assert.strictEqual(isJsonRpcRequest(request), true);
    });

    test("should handle empty params", () => {
      const request = createRequest(2, "shutdown", {});
      assert.deepStrictEqual(request.params, {});
    });

    test("should increment id correctly", () => {
      const req1 = createRequest(1, "test", {});
      const req2 = createRequest(2, "test", {});
      assert.strictEqual(req2.id, req1.id + 1);
    });
  });

  suite("createSuccessResponse", () => {
    test("should create valid success response", () => {
      const result = {
        protocolVersion: "1.0.0",
        engineVersion: "0.28.0",
        capabilities: {
          hatStyles: 88,
          customCommands: true,
        },
      };

      const response = createSuccessResponse(1, result);

      assert.deepStrictEqual(response, {
        jsonrpc: "2.0",
        id: 1,
        result,
      });
      assert.strictEqual(isJsonRpcResponse(response), true);
      assert.strictEqual(response.error, undefined);
    });

    test("should handle null result", () => {
      const response = createSuccessResponse(1, null);
      assert.strictEqual(response.result, null);
    });
  });

  suite("createErrorResponse", () => {
    test("should create valid error response", () => {
      const error = {
        code: ErrorCodes.METHOD_NOT_FOUND,
        message: "Method not found: unknownMethod",
      };

      const response = createErrorResponse(1, error);

      assert.deepStrictEqual(response, {
        jsonrpc: "2.0",
        id: 1,
        error,
      });
      assert.strictEqual(isJsonRpcResponse(response), true);
      assert.strictEqual(response.result, undefined);
    });

    test("should include error data when provided", () => {
      const error = {
        code: ErrorCodes.COMMAND_EXECUTION_FAILED,
        message: "Command failed",
        data: { reason: "Target not found" },
      };

      const response = createErrorResponse(1, error);
      assert.deepStrictEqual(response.error?.data, {
        reason: "Target not found",
      });
    });
  });

  suite("createNotification", () => {
    test("should create valid notification", () => {
      const params = { editorId: "editor-1" };
      const notification = createNotification("clearHats", params);

      assert.deepStrictEqual(notification, {
        jsonrpc: "2.0",
        method: "clearHats",
        params,
      });
      assert.strictEqual(isJsonRpcNotification(notification), true);
      assert.strictEqual("id" in notification, false);
    });
  });

  suite("createError", () => {
    test("should create error without data", () => {
      const error = createError(
        ErrorCodes.INTERNAL_ERROR,
        "Something went wrong",
      );

      assert.strictEqual(error.data, undefined);
      assert.strictEqual(error.code, ErrorCodes.INTERNAL_ERROR);
      assert.strictEqual(error.message, "Something went wrong");
    });

    test("should create error with data", () => {
      const error = createError(
        ErrorCodes.COMMAND_EXECUTION_FAILED,
        "Execution failed",
        { details: "More info" },
      );

      assert.deepStrictEqual(error.data, { details: "More info" });
    });
  });
});

suite("JsonRpcErrors Factory", () => {
  test("should create parse error", () => {
    const error = JsonRpcErrors.parseError();
    assert.strictEqual(error.code, ErrorCodes.PARSE_ERROR);
    assert.strictEqual(error.message, "Parse error");
  });

  test("should create invalid request error", () => {
    const error = JsonRpcErrors.invalidRequest();
    assert.strictEqual(error.code, ErrorCodes.INVALID_REQUEST);
    assert.strictEqual(error.message, "Invalid Request");
  });

  test("should create method not found error", () => {
    const error = JsonRpcErrors.methodNotFound("testMethod");
    assert.strictEqual(error.code, ErrorCodes.METHOD_NOT_FOUND);
    assert.ok(error.message.includes("testMethod"));
  });

  test("should create invalid params error", () => {
    const error = JsonRpcErrors.invalidParams("Missing required field");
    assert.strictEqual(error.code, ErrorCodes.INVALID_PARAMS);
    assert.strictEqual(error.message, "Missing required field");
  });

  test("should create internal error", () => {
    const error = JsonRpcErrors.internalError("Unexpected error");
    assert.strictEqual(error.code, ErrorCodes.INTERNAL_ERROR);
    assert.strictEqual(error.message, "Unexpected error");
  });

  test("should create engine not initialized error", () => {
    const error = JsonRpcErrors.engineNotInitialized();
    assert.strictEqual(error.code, ErrorCodes.ENGINE_NOT_INITIALIZED);
    assert.ok(error.message.includes("initialize"));
  });

  test("should create invalid editor state error", () => {
    const error = JsonRpcErrors.invalidEditorState("No active editor");
    assert.strictEqual(error.code, ErrorCodes.INVALID_EDITOR_STATE);
    assert.strictEqual(error.message, "No active editor");
  });

  test("should create command execution failed error", () => {
    const error = JsonRpcErrors.commandExecutionFailed("Failed to execute", {
      command: "take blue fox",
    });
    assert.strictEqual(error.code, ErrorCodes.COMMAND_EXECUTION_FAILED);
    assert.strictEqual(error.message, "Failed to execute");
    assert.deepStrictEqual(error.data, { command: "take blue fox" });
  });

  test("should create token not found error", () => {
    const error = JsonRpcErrors.tokenNotFound(5);
    assert.strictEqual(error.code, ErrorCodes.TOKEN_NOT_FOUND);
    assert.ok(error.message.includes("5"));
  });

  test("should create hat allocation failed error", () => {
    const error = JsonRpcErrors.hatAllocationFailed("No hats available");
    assert.strictEqual(error.code, ErrorCodes.HAT_ALLOCATION_FAILED);
    assert.strictEqual(error.message, "No hats available");
  });
});

suite("Protocol Message Serialization", () => {
  test("should serialize and deserialize request", () => {
    const request = createRequest(1, "initialize", {
      protocolVersion: "1.0.0",
      editorName: "zed",
      capabilities: { decorations: true, multiCursor: true },
    });

    const json = JSON.stringify(request);
    const parsed = JSON.parse(json);

    assert.strictEqual(isJsonRpcRequest(parsed), true);
    assert.deepStrictEqual(parsed, request);
  });

  test("should serialize and deserialize response", () => {
    const response = createSuccessResponse(1, {
      hats: [
        {
          tokenIndex: 0,
          hatStyle: { shape: "fox", color: "blue" },
          grapheme: "f",
        },
      ],
    });

    const json = JSON.stringify(response);
    const parsed = JSON.parse(json);

    assert.strictEqual(isJsonRpcResponse(parsed), true);
    assert.deepStrictEqual(parsed, response);
  });

  test("should serialize notification", () => {
    const notification = createNotification("clearHats", {
      editorId: "editor-1",
    });

    const json = JSON.stringify(notification);
    const parsed = JSON.parse(json);

    assert.strictEqual(isJsonRpcNotification(parsed), true);
    assert.deepStrictEqual(parsed, notification);
  });

  test("should handle complex nested params", () => {
    const params: GetHatAllocationsParams = {
      editorId: "editor-1",
      documentUri: "file:///test.rs",
      visibleRange: {
        start: { line: 0, character: 0 },
        end: { line: 50, character: 80 },
      },
      tokens: [
        {
          text: "fn",
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 2 },
          },
        },
        {
          text: "main",
          range: {
            start: { line: 1, character: 3 },
            end: { line: 1, character: 7 },
          },
        },
      ],
    };

    const request = createRequest(2, "getHatAllocations", params);
    const json = JSON.stringify(request);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.params.tokens.length, 2);
    assert.strictEqual(parsed.params.tokens[0].text, "fn");
    assert.strictEqual(parsed.params.visibleRange.start.line, 0);
  });
});

suite("Type Safety", () => {
  test("should enforce Position structure", () => {
    const position = { line: 10, character: 5 };

    assert.strictEqual(position.line, 10);
    assert.strictEqual(position.character, 5);
  });

  test("should enforce Range structure", () => {
    const range = {
      start: { line: 0, character: 0 },
      end: { line: 10, character: 20 },
    };

    assert.strictEqual(range.start.line, 0);
    assert.strictEqual(range.end.character, 20);
  });

  test("should enforce HatAllocation structure", () => {
    const allocation: HatAllocation = {
      tokenIndex: 0,
      hatStyle: {
        shape: "fox",
        color: "blue",
      },
      grapheme: "f",
    };

    assert.strictEqual(allocation.tokenIndex, 0);
    assert.strictEqual(allocation.hatStyle.shape, "fox");
    assert.strictEqual(allocation.grapheme, "f");
  });
});
