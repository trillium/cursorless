import * as assert from "assert";
import {
  parseMessage,
  serializeMessage,
  isRequest,
  isResponse,
  isNotification,
  LineBuffer,
  MessageStream,
  type ParsedMessage,
} from "../message-parser";
import {
  createRequest,
  createSuccessResponse,
  createNotification,
  ErrorCodes,
} from "../protocol-types";

suite("parseMessage", () => {
  test("should parse valid request", () => {
    const request = createRequest(1, "initialize", {
      protocolVersion: "1.0.0",
    });
    const line = JSON.stringify(request);

    const result = parseMessage(line);

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.deepStrictEqual(result.message, request);
    }
  });

  test("should parse valid response", () => {
    const response = createSuccessResponse(1, { status: "ok" });
    const line = JSON.stringify(response);

    const result = parseMessage(line);

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.deepStrictEqual(result.message, response);
    }
  });

  test("should parse valid notification", () => {
    const notification = createNotification("clearHats", {
      editorId: "editor-1",
    });
    const line = JSON.stringify(notification);

    const result = parseMessage(line);

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.deepStrictEqual(result.message, notification);
    }
  });

  test("should handle trailing newline", () => {
    const request = createRequest(1, "test", {});
    const line = JSON.stringify(request) + "\n";

    const result = parseMessage(line);

    assert.strictEqual(result.success, true);
  });

  test("should handle leading/trailing whitespace", () => {
    const request = createRequest(1, "test", {});
    const line = "  " + JSON.stringify(request) + "  \n";

    const result = parseMessage(line);

    assert.strictEqual(result.success, true);
  });

  test("should reject invalid JSON", () => {
    const result = parseMessage("{ invalid json }");

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.code, ErrorCodes.PARSE_ERROR);
    }
  });

  test("should reject empty string", () => {
    const result = parseMessage("");

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.code, ErrorCodes.PARSE_ERROR);
    }
  });

  test("should reject whitespace-only string", () => {
    const result = parseMessage("   \n  ");

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.code, ErrorCodes.PARSE_ERROR);
    }
  });

  test("should reject non-JSON-RPC objects", () => {
    const result = parseMessage(JSON.stringify({ foo: "bar" }));

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.code, ErrorCodes.INVALID_REQUEST);
    }
  });

  test("should parse message without id as notification", () => {
    const notification = {
      jsonrpc: "2.0",
      method: "test",
      params: {},
    };
    const result = parseMessage(JSON.stringify(notification));

    // A message with method + params but no id is a valid notification
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(isNotification(result), true);
    }
  });

  test("should reject request without method", () => {
    const invalid = {
      jsonrpc: "2.0",
      id: 1,
      params: {},
    };
    const result = parseMessage(JSON.stringify(invalid));

    assert.strictEqual(result.success, false);
  });

  test("should reject message with wrong jsonrpc version", () => {
    const invalid = {
      jsonrpc: "1.0",
      id: 1,
      method: "test",
      params: {},
    };
    const result = parseMessage(JSON.stringify(invalid));

    assert.strictEqual(result.success, false);
  });
});

suite("serializeMessage", () => {
  test("should serialize request with trailing newline", () => {
    const request = createRequest(1, "initialize", { test: "data" });
    const serialized = serializeMessage(request);

    assert.strictEqual(serialized.endsWith("\n"), true);
    assert.strictEqual(serialized.split("\n").length, 2); // content + empty after newline
  });

  test("should serialize response", () => {
    const response = createSuccessResponse(1, { hats: [] });
    const serialized = serializeMessage(response);

    assert.deepStrictEqual(JSON.parse(serialized.trim()), response);
  });

  test("should serialize notification", () => {
    const notification = createNotification("test", {});
    const serialized = serializeMessage(notification);

    assert.deepStrictEqual(JSON.parse(serialized.trim()), notification);
  });

  test("should create single-line output", () => {
    const request = createRequest(1, "test", { nested: { data: "value" } });
    const serialized = serializeMessage(request);
    const lines = serialized.split("\n");

    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].length > 0);
    assert.strictEqual(lines[1], "");
  });

  test("should round-trip correctly", () => {
    const original = createRequest(1, "initialize", {
      protocolVersion: "1.0.0",
      editorName: "zed",
    });

    const serialized = serializeMessage(original);
    const parsed = parseMessage(serialized);

    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.deepStrictEqual(parsed.message, original);
    }
  });
});

suite("Type Guards", () => {
  test("should identify request", () => {
    const request = createRequest(1, "test", {});
    const line = JSON.stringify(request);
    const result = parseMessage(line);

    assert.strictEqual(isRequest(result), true);
    assert.strictEqual(isResponse(result), false);
    assert.strictEqual(isNotification(result), false);
  });

  test("should identify response", () => {
    const response = createSuccessResponse(1, {});
    const line = JSON.stringify(response);
    const result = parseMessage(line);

    assert.strictEqual(isRequest(result), false);
    assert.strictEqual(isResponse(result), true);
    assert.strictEqual(isNotification(result), false);
  });

  test("should identify notification", () => {
    const notification = createNotification("test", {});
    const line = JSON.stringify(notification);
    const result = parseMessage(line);

    assert.strictEqual(isRequest(result), false);
    assert.strictEqual(isResponse(result), false);
    assert.strictEqual(isNotification(result), true);
  });

  test("should not identify error as any type", () => {
    const result = parseMessage("invalid");

    assert.strictEqual(isRequest(result), false);
    assert.strictEqual(isResponse(result), false);
    assert.strictEqual(isNotification(result), false);
  });
});

suite("LineBuffer", () => {
  let buffer: LineBuffer;

  setup(() => {
    buffer = new LineBuffer();
  });

  test("should extract single complete line", () => {
    const lines = buffer.push('{"test": "data"}\n');

    assert.deepStrictEqual(lines, ['{"test": "data"}']);
    assert.strictEqual(buffer.remaining(), "");
  });

  test("should extract multiple complete lines", () => {
    const lines = buffer.push("line1\nline2\nline3\n");

    assert.deepStrictEqual(lines, ["line1", "line2", "line3"]);
    assert.strictEqual(buffer.remaining(), "");
  });

  test("should buffer incomplete line", () => {
    const lines = buffer.push('{"incomplete": ');

    assert.deepStrictEqual(lines, []);
    assert.strictEqual(buffer.remaining(), '{"incomplete": ');
  });

  test("should complete buffered line", () => {
    buffer.push('{"test": ');
    const lines = buffer.push('"data"}\n');

    assert.deepStrictEqual(lines, ['{"test": "data"}']);
    assert.strictEqual(buffer.remaining(), "");
  });

  test("should handle mixed complete and incomplete lines", () => {
    const lines = buffer.push("complete1\ncomplete2\nincomplete");

    assert.deepStrictEqual(lines, ["complete1", "complete2"]);
    assert.strictEqual(buffer.remaining(), "incomplete");
  });

  test("should handle empty input", () => {
    const lines = buffer.push("");

    assert.deepStrictEqual(lines, []);
    assert.strictEqual(buffer.remaining(), "");
  });

  test("should handle newline-only input", () => {
    buffer.push("data");
    const lines = buffer.push("\n");

    assert.deepStrictEqual(lines, ["data"]);
    assert.strictEqual(buffer.remaining(), "");
  });

  test("should handle multiple newlines", () => {
    const lines = buffer.push("line1\n\n\nline2\n");

    assert.deepStrictEqual(lines, ["line1", "", "", "line2"]);
  });

  test("should clear buffer", () => {
    buffer.push("some data");
    buffer.clear();

    assert.strictEqual(buffer.remaining(), "");
    assert.strictEqual(buffer.hasData(), false);
  });

  test("should detect buffered data", () => {
    assert.strictEqual(buffer.hasData(), false);

    buffer.push("data");
    assert.strictEqual(buffer.hasData(), true);

    buffer.push("\n");
    assert.strictEqual(buffer.hasData(), false);
  });

  test("should handle chunked JSON", () => {
    const json = '{"key":"value","nested":{"data":[1,2,3]}}';
    const chunks = [
      json.slice(0, 10),
      json.slice(10, 20),
      json.slice(20, 30),
      json.slice(30) + "\n",
    ];

    let allLines: string[] = [];
    for (const chunk of chunks) {
      const lines = buffer.push(chunk);
      allLines = allLines.concat(lines);
    }

    assert.deepStrictEqual(allLines, [json]);
    assert.strictEqual(buffer.remaining(), "");
  });
});

suite("MessageStream", () => {
  let stream: MessageStream;

  setup(() => {
    stream = new MessageStream();
  });

  test("should process single complete message", () => {
    const request = createRequest(1, "test", {});
    const data = serializeMessage(request);

    const messages = Array.from(stream.process(data));

    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].success, true);
    if (messages[0].success) {
      assert.deepStrictEqual(messages[0].message, request);
    }
  });

  test("should process multiple messages", () => {
    const req1 = createRequest(1, "test1", {});
    const req2 = createRequest(2, "test2", {});
    const data = serializeMessage(req1) + serializeMessage(req2);

    const messages = Array.from(stream.process(data));

    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].success, true);
    assert.strictEqual(messages[1].success, true);
  });

  test("should buffer incomplete message", () => {
    const request = createRequest(1, "test", {});
    const data = JSON.stringify(request);

    const messages = Array.from(stream.process(data));

    assert.strictEqual(messages.length, 0);
    assert.strictEqual(stream.getRemaining(), data);
  });

  test("should complete buffered message", () => {
    const request = createRequest(1, "test", {});
    const data = JSON.stringify(request);

    Array.from(stream.process(data.slice(0, 10)));
    const messages = Array.from(stream.process(data.slice(10) + "\n"));

    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].success, true);
  });

  test("should handle mixed valid and invalid messages", () => {
    const valid = createRequest(1, "test", {});
    const data =
      serializeMessage(valid) + "invalid\n" + serializeMessage(valid);

    const messages = Array.from(stream.process(data));

    assert.strictEqual(messages.length, 3);
    assert.strictEqual(messages[0].success, true);
    assert.strictEqual(messages[1].success, false);
    assert.strictEqual(messages[2].success, true);
  });

  test("should clear stream", () => {
    stream.process("incomplete");
    stream.clear();

    assert.strictEqual(stream.getRemaining(), "");
  });

  test("should handle chunked streaming", () => {
    const messages = [
      createRequest(1, "test1", {}),
      createRequest(2, "test2", {}),
      createNotification("notify", {}),
    ];

    const fullData = messages.map(serializeMessage).join("");
    const chunkSize = 20;
    const allParsed: ParsedMessage[] = [];

    for (let i = 0; i < fullData.length; i += chunkSize) {
      const chunk = fullData.slice(i, i + chunkSize);
      const parsed = Array.from(stream.process(chunk));
      allParsed.push(...parsed);
    }

    assert.strictEqual(allParsed.length, 3);
    assert.strictEqual(
      allParsed.every((p) => p.success),
      true,
    );
  });

  test("should handle real-world chunked data", () => {
    const request = createRequest(1, "getHatAllocations", {
      editorId: "editor-1",
      documentUri: "file:///home/user/test.rs",
      visibleRange: {
        start: { line: 0, character: 0 },
        end: { line: 100, character: 80 },
      },
      tokens: Array.from({ length: 50 }, (_, i) => ({
        text: `token${i}`,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: 6 },
        },
      })),
    });

    const data = serializeMessage(request);
    const chunks = [
      data.slice(0, 100),
      data.slice(100, 500),
      data.slice(500, 1000),
      data.slice(1000),
    ];

    const allParsed: ParsedMessage[] = [];
    for (const chunk of chunks) {
      const parsed = Array.from(stream.process(chunk));
      allParsed.push(...parsed);
    }

    assert.strictEqual(allParsed.length, 1);
    assert.strictEqual(allParsed[0].success, true);
    if (allParsed[0].success) {
      assert.deepStrictEqual(allParsed[0].message, request);
    }
  });
});
