import * as assert from "assert";
import { Readable, Writable } from "node:stream";
import { EngineWrapper } from "../engine-wrapper";
import {
  createRequest,
  createNotification,
  PROTOCOL_VERSION,
} from "../protocol-types";
import { parseMessage, serializeMessage } from "../message-parser";

/**
 * Helper to create a mock input stream
 */
function createMockInput(): Readable & { pushLine: (line: string) => void } {
  const stream = new Readable({
    read() {},
  });

  return Object.assign(stream, {
    pushLine(line: string) {
      stream.push(line + "\n");
    },
  });
}

/**
 * Helper to create a mock output stream that captures messages
 */
function createMockOutput(): Writable & { getMessages: () => unknown[] } {
  const messages: unknown[] = [];
  let buffer = "";

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += chunk.toString();

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.trim()) {
          const parsed = parseMessage(line);
          if (parsed.success) {
            messages.push(parsed.message);
          }
        }
      }

      callback();
    },
  });

  return Object.assign(stream, {
    getMessages() {
      return messages;
    },
  });
}

suite("EngineWrapper Integration", () => {
  let input: ReturnType<typeof createMockInput>;
  let output: ReturnType<typeof createMockOutput>;
  let errorStream: Writable;
  let wrapper: EngineWrapper;

  setup(() => {
    input = createMockInput();
    output = createMockOutput();
    errorStream = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    wrapper = new EngineWrapper({
      engineVersion: "0.28.0",
      input,
      output,
      errorStream,
      debug: false,
    });
  });

  suite("Initialize Flow", () => {
    test("should handle initialize request", async () => {
      const startPromise = wrapper.start();

      const request = createRequest(1, "initialize", {
        protocolVersion: PROTOCOL_VERSION,
        editorName: "zed",
        capabilities: {
          decorations: true,
          multiCursor: true,
        },
      });

      input.pushLine(serializeMessage(request).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messages = output.getMessages();
      assert.strictEqual(messages.length, 1);

      const response = messages[0] as any;
      assert.strictEqual(response.id, 1);
      assert.notStrictEqual(response.result, undefined);
      assert.strictEqual(response.result.protocolVersion, PROTOCOL_VERSION);
      assert.strictEqual(response.result.engineVersion, "0.28.0");
      assert.strictEqual(response.result.capabilities.hatStyles, 88);

      input.push(null);
      await startPromise;
    });

    test("should warn on protocol version mismatch", async () => {
      const errorMessages: string[] = [];
      errorStream = new Writable({
        write(chunk, _encoding, callback) {
          errorMessages.push(chunk.toString());
          callback();
        },
      });

      wrapper = new EngineWrapper({
        engineVersion: "0.28.0",
        input,
        output,
        errorStream,
        debug: true,
      });

      const startPromise = wrapper.start();

      const request = createRequest(1, "initialize", {
        protocolVersion: "2.0.0",
        editorName: "zed",
        capabilities: { decorations: true, multiCursor: true },
      });

      input.pushLine(serializeMessage(request).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      const warningFound = errorMessages.some((msg) =>
        msg.includes("Protocol version mismatch"),
      );
      assert.strictEqual(warningFound, true);

      input.push(null);
      await startPromise;
    });
  });

  suite("Hat Allocation Flow", () => {
    test("should handle getHatAllocations request", async () => {
      const startPromise = wrapper.start();

      // Initialize first
      input.pushLine(
        serializeMessage(
          createRequest(1, "initialize", {
            protocolVersion: PROTOCOL_VERSION,
            editorName: "zed",
            capabilities: { decorations: true, multiCursor: true },
          }),
        ).trim(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Request hat allocations
      const hatRequest = createRequest(2, "getHatAllocations", {
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
      });

      input.pushLine(serializeMessage(hatRequest).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messages = output.getMessages();
      assert.ok(messages.length >= 2);

      const hatResponse = messages[1] as any;
      assert.strictEqual(hatResponse.id, 2);
      assert.notStrictEqual(hatResponse.result, undefined);
      assert.strictEqual(hatResponse.result.hats.length, 2);
      assert.strictEqual(hatResponse.result.hats[0].tokenIndex, 0);
      assert.notStrictEqual(hatResponse.result.hats[0].hatStyle, undefined);
      assert.strictEqual(hatResponse.result.hats[0].grapheme, "f");

      input.push(null);
      await startPromise;
    });

    test("should return error if not initialized", async () => {
      const startPromise = wrapper.start();

      const request = createRequest(1, "getHatAllocations", {
        editorId: "editor-1",
        documentUri: "file:///test.rs",
        visibleRange: {
          start: { line: 0, character: 0 },
          end: { line: 10, character: 80 },
        },
        tokens: [],
      });

      input.pushLine(serializeMessage(request).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messages = output.getMessages();
      assert.strictEqual(messages.length, 1);

      const response = messages[0] as any;
      assert.notStrictEqual(response.error, undefined);
      assert.strictEqual(response.error.code, -32000);
      assert.ok(response.error.message.includes("not initialized"));

      input.push(null);
      await startPromise;
    });
  });

  suite("Command Execution Flow", () => {
    test("should handle executeCommand request", async () => {
      const startPromise = wrapper.start();

      // Initialize
      input.pushLine(
        serializeMessage(
          createRequest(1, "initialize", {
            protocolVersion: PROTOCOL_VERSION,
            editorName: "zed",
            capabilities: { decorations: true, multiCursor: true },
          }),
        ).trim(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Execute command
      const cmdRequest = createRequest(2, "executeCommand", {
        commandId: "cursorless.command",
        args: [
          {
            version: 6,
            spokenForm: "take blue fox",
            action: { name: "setSelection" },
          },
        ],
        editorState: {
          documentUri: "file:///test.rs",
          cursorPosition: { line: 5, character: 10 },
          selections: [
            {
              anchor: { line: 5, character: 10 },
              active: { line: 5, character: 10 },
            },
          ],
        },
      });

      input.pushLine(serializeMessage(cmdRequest).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messages = output.getMessages();
      assert.ok(messages.length >= 2);

      const cmdResponse = messages[1] as any;
      assert.strictEqual(cmdResponse.id, 2);
      assert.notStrictEqual(cmdResponse.result, undefined);

      input.push(null);
      await startPromise;
    });
  });

  suite("Notification Handling", () => {
    test("should handle clearHats notification", async () => {
      const startPromise = wrapper.start();

      // Initialize
      input.pushLine(
        serializeMessage(
          createRequest(1, "initialize", {
            protocolVersion: PROTOCOL_VERSION,
            editorName: "zed",
            capabilities: { decorations: true, multiCursor: true },
          }),
        ).trim(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send notification
      const notification = createNotification("clearHats", {
        editorId: "editor-1",
      });

      input.pushLine(serializeMessage(notification).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Notifications don't produce responses
      const messages = output.getMessages();
      assert.strictEqual(messages.length, 1); // Only initialize response

      input.push(null);
      await startPromise;
    });

    test("should handle updateEditorState notification", async () => {
      const startPromise = wrapper.start();

      input.pushLine(
        serializeMessage(
          createRequest(1, "initialize", {
            protocolVersion: PROTOCOL_VERSION,
            editorName: "zed",
            capabilities: { decorations: true, multiCursor: true },
          }),
        ).trim(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const notification = createNotification("updateEditorState", {
        editorId: "editor-1",
        documentUri: "file:///test.rs",
        cursorPosition: { line: 10, character: 5 },
        selections: [
          {
            anchor: { line: 10, character: 5 },
            active: { line: 10, character: 15 },
          },
        ],
      });

      input.pushLine(serializeMessage(notification).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messages = output.getMessages();
      assert.strictEqual(messages.length, 1);

      input.push(null);
      await startPromise;
    });
  });

  suite("Shutdown Flow", () => {
    test("should handle shutdown request", async () => {
      const startPromise = wrapper.start();

      input.pushLine(
        serializeMessage(createRequest(1, "shutdown", {})).trim(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messages = output.getMessages();
      assert.strictEqual(messages.length, 1);

      const response = messages[0] as any;
      assert.strictEqual(response.id, 1);
      assert.strictEqual(response.result, null);

      input.push(null);
      await startPromise;
    });
  });

  suite("Error Handling", () => {
    test("should handle unknown method", async () => {
      const startPromise = wrapper.start();

      const request = createRequest(1, "unknownMethod", {});
      input.pushLine(serializeMessage(request).trim());

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messages = output.getMessages();
      assert.strictEqual(messages.length, 1);

      const response = messages[0] as any;
      assert.notStrictEqual(response.error, undefined);
      assert.strictEqual(response.error.code, -32601);
      assert.ok(response.error.message.includes("unknownMethod"));

      input.push(null);
      await startPromise;
    });

    test("should handle malformed JSON", async () => {
      const startPromise = wrapper.start();

      input.pushLine("{ invalid json }");

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Malformed JSON is logged but doesn't produce a response
      const messages = output.getMessages();
      assert.strictEqual(messages.length, 0);

      input.push(null);
      await startPromise;
    });
  });

  suite("Multiple Requests", () => {
    test("should handle multiple sequential requests", async () => {
      const startPromise = wrapper.start();

      const requests = [
        createRequest(1, "initialize", {
          protocolVersion: PROTOCOL_VERSION,
          editorName: "zed",
          capabilities: { decorations: true, multiCursor: true },
        }),
        createRequest(2, "getFocusedElementType", {}),
        createRequest(3, "shutdown", {}),
      ];

      for (const req of requests) {
        input.pushLine(serializeMessage(req).trim());
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      const messages = output.getMessages();
      assert.strictEqual(messages.length, 3);

      assert.strictEqual((messages[0] as any).id, 1);
      assert.strictEqual((messages[1] as any).id, 2);
      assert.strictEqual((messages[2] as any).id, 3);

      input.push(null);
      await startPromise;
    });
  });
});
