import * as assert from "assert";
import * as sinon from "sinon";
import { MethodHandlerRegistry } from "../method-handlers";
import {
  createRequest,
  createNotification,
  ErrorCodes,
  JsonRpcErrors,
} from "../protocol-types";

suite("MethodHandlerRegistry", () => {
  let registry: MethodHandlerRegistry;

  setup(() => {
    registry = new MethodHandlerRegistry();
  });

  teardown(() => {
    sinon.restore();
  });

  suite("Request Handlers", () => {
    test("should register request handler", () => {
      const handler = sinon.fake.returns({ result: "ok" });
      registry.registerRequest("testMethod", handler);

      assert.strictEqual(registry.hasRequestHandler("testMethod"), true);
    });

    test("should throw when registering duplicate request handler", () => {
      registry.registerRequest("testMethod", () => ({}));

      assert.throws(() => {
        registry.registerRequest("testMethod", () => ({}));
      }, /already registered/);
    });

    test("should handle request with registered handler", async () => {
      const handler = sinon.fake.returns({ status: "success" });
      registry.registerRequest("testMethod", handler);

      const request = createRequest(1, "testMethod", { input: "data" });
      const response = await registry.handleRequest(request);

      sinon.assert.calledWith(handler, { input: "data" });
      assert.strictEqual(response.id, 1);
      assert.deepStrictEqual(response.result, { status: "success" });
      assert.strictEqual(response.error, undefined);
    });

    test("should handle async request handler", async () => {
      const handler = sinon.fake(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { async: "result" };
      });
      registry.registerRequest("asyncMethod", handler);

      const request = createRequest(1, "asyncMethod", {});
      const response = await registry.handleRequest(request);

      assert.deepStrictEqual(response.result, { async: "result" });
    });

    test("should return method not found for unregistered method", async () => {
      const request = createRequest(1, "unknownMethod", {});
      const response = await registry.handleRequest(request);

      assert.notStrictEqual(response.error, undefined);
      assert.strictEqual(response.error?.code, ErrorCodes.METHOD_NOT_FOUND);
      assert.ok(response.error?.message.includes("unknownMethod"));
      assert.strictEqual(response.result, undefined);
    });

    test("should handle handler throwing error", async () => {
      const handler = sinon.fake(() => {
        throw new Error("Handler failed");
      });
      registry.registerRequest("failingMethod", handler);

      const request = createRequest(1, "failingMethod", {});
      const response = await registry.handleRequest(request);

      assert.notStrictEqual(response.error, undefined);
      assert.strictEqual(response.error?.code, ErrorCodes.INTERNAL_ERROR);
      assert.ok(response.error?.message.includes("Handler failed"));
    });

    test("should handle handler throwing JSON-RPC error", async () => {
      const handler = sinon.fake(() => {
        throw JsonRpcErrors.invalidParams("Missing required field");
      });
      registry.registerRequest("validateMethod", handler);

      const request = createRequest(1, "validateMethod", {});
      const response = await registry.handleRequest(request);

      assert.notStrictEqual(response.error, undefined);
      assert.strictEqual(response.error?.code, ErrorCodes.INVALID_PARAMS);
      assert.ok(response.error?.message.includes("Missing required field"));
    });

    test("should handle async handler throwing error", async () => {
      const handler = sinon.fake(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("Async error");
      });
      registry.registerRequest("asyncError", handler);

      const request = createRequest(1, "asyncError", {});
      const response = await registry.handleRequest(request);

      assert.ok(response.error?.message.includes("Async error"));
    });

    test("should handle multiple different requests", async () => {
      registry.registerRequest("method1", () => ({ value: 1 }));
      registry.registerRequest("method2", () => ({ value: 2 }));
      registry.registerRequest("method3", () => ({ value: 3 }));

      const req1 = createRequest(1, "method1", {});
      const req2 = createRequest(2, "method2", {});
      const req3 = createRequest(3, "method3", {});

      const [resp1, resp2, resp3] = await Promise.all([
        registry.handleRequest(req1),
        registry.handleRequest(req2),
        registry.handleRequest(req3),
      ]);

      assert.deepStrictEqual(resp1.result, { value: 1 });
      assert.deepStrictEqual(resp2.result, { value: 2 });
      assert.deepStrictEqual(resp3.result, { value: 3 });
    });

    test("should preserve request id in response", async () => {
      registry.registerRequest("test", () => ({}));

      const response = await registry.handleRequest(
        createRequest(42, "test", {}),
      );

      assert.strictEqual(response.id, 42);
    });
  });

  suite("Notification Handlers", () => {
    test("should register notification handler", () => {
      const handler = sinon.fake();
      registry.registerNotification("notifyMethod", handler);

      assert.strictEqual(
        registry.hasNotificationHandler("notifyMethod"),
        true,
      );
    });

    test("should throw when registering duplicate notification handler", () => {
      registry.registerNotification("notifyMethod", () => {});

      assert.throws(() => {
        registry.registerNotification("notifyMethod", () => {});
      }, /already registered/);
    });

    test("should handle notification with registered handler", async () => {
      const handler = sinon.fake();
      registry.registerNotification("clearHats", handler);

      const notification = createNotification("clearHats", {
        editorId: "editor-1",
      });
      await registry.handleNotification(notification);

      sinon.assert.calledWith(handler, { editorId: "editor-1" });
    });

    test("should handle async notification handler", async () => {
      const handler = sinon.fake(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      registry.registerNotification("asyncNotify", handler);

      const notification = createNotification("asyncNotify", {});
      await registry.handleNotification(notification);

      sinon.assert.called(handler);
    });

    test("should silently ignore unregistered notification", async () => {
      const notification = createNotification("unknownNotify", {});

      assert.strictEqual(
        await registry.handleNotification(notification),
        undefined,
      );
    });

    test("should catch and log notification handler errors", async () => {
      const consoleError = sinon.stub(console, "error");
      const handler = sinon.fake(() => {
        throw new Error("Notification error");
      });
      registry.registerNotification("failingNotify", handler);

      const notification = createNotification("failingNotify", {});
      await registry.handleNotification(notification);

      sinon.assert.called(consoleError);
    });

    test("should handle multiple notifications", async () => {
      const handler1 = sinon.fake();
      const handler2 = sinon.fake();

      registry.registerNotification("notify1", handler1);
      registry.registerNotification("notify2", handler2);

      await Promise.all([
        registry.handleNotification(createNotification("notify1", {})),
        registry.handleNotification(createNotification("notify2", {})),
      ]);

      sinon.assert.called(handler1);
      sinon.assert.called(handler2);
    });
  });

  suite("Handler Introspection", () => {
    test("should list all registered request methods", () => {
      registry.registerRequest("method1", () => ({}));
      registry.registerRequest("method2", () => ({}));
      registry.registerRequest("method3", () => ({}));

      const methods = registry.getRequestMethods();

      assert.strictEqual(methods.length, 3);
      assert.ok(methods.includes("method1"));
      assert.ok(methods.includes("method2"));
      assert.ok(methods.includes("method3"));
    });

    test("should list all registered notification methods", () => {
      registry.registerNotification("notify1", () => {});
      registry.registerNotification("notify2", () => {});

      const methods = registry.getNotificationMethods();

      assert.strictEqual(methods.length, 2);
      assert.ok(methods.includes("notify1"));
      assert.ok(methods.includes("notify2"));
    });

    test("should return empty arrays when no handlers registered", () => {
      assert.deepStrictEqual(registry.getRequestMethods(), []);
      assert.deepStrictEqual(registry.getNotificationMethods(), []);
    });
  });

  suite("Clear Handlers", () => {
    test("should clear all handlers", () => {
      registry.registerRequest("req1", () => ({}));
      registry.registerRequest("req2", () => ({}));
      registry.registerNotification("notify1", () => {});

      registry.clear();

      assert.strictEqual(registry.hasRequestHandler("req1"), false);
      assert.strictEqual(registry.hasRequestHandler("req2"), false);
      assert.strictEqual(registry.hasNotificationHandler("notify1"), false);
      assert.deepStrictEqual(registry.getRequestMethods(), []);
      assert.deepStrictEqual(registry.getNotificationMethods(), []);
    });

    test("should allow re-registration after clear", () => {
      registry.registerRequest("test", () => ({}));
      registry.clear();

      assert.doesNotThrow(() => {
        registry.registerRequest("test", () => ({}));
      });
    });
  });

  suite("Parameter Handling", () => {
    test("should pass params to handler", async () => {
      const handler = sinon.fake((params: unknown) => params);
      registry.registerRequest("echo", handler);

      const complexParams = {
        nested: {
          data: [1, 2, 3],
          obj: { key: "value" },
        },
        array: ["a", "b", "c"],
      };

      const request = createRequest(1, "echo", complexParams);
      const response = await registry.handleRequest(request);

      sinon.assert.calledWith(handler, complexParams);
      assert.deepStrictEqual(response.result, complexParams);
    });

    test("should handle null params", async () => {
      const handler = sinon.fake((params: unknown) => ({ received: params }));
      registry.registerRequest("nullTest", handler);

      const request = createRequest(1, "nullTest", null);
      const response = await registry.handleRequest(request);

      sinon.assert.calledWith(handler, null);
      assert.deepStrictEqual(response.result, { received: null });
    });

    test("should handle undefined params", async () => {
      const handler = sinon.fake((params: unknown) => ({ received: params }));
      registry.registerRequest("undefinedTest", handler);

      const request = createRequest(1, "undefinedTest", undefined);
      await registry.handleRequest(request);

      sinon.assert.calledWith(handler, undefined);
    });
  });

  suite("Error Conversion", () => {
    test("should convert Error object to JSON-RPC error", async () => {
      const handler = sinon.fake(() => {
        throw new Error("Test error message");
      });
      registry.registerRequest("errorTest", handler);

      const request = createRequest(1, "errorTest", {});
      const response = await registry.handleRequest(request);

      assert.ok(response.error?.message.includes("Test error message"));
    });

    test("should convert string throw to JSON-RPC error", async () => {
      const handler = sinon.fake(() => {
        // eslint-disable-next-line no-throw-literal
        throw "String error";
      });
      registry.registerRequest("stringError", handler);

      const request = createRequest(1, "stringError", {});
      const response = await registry.handleRequest(request);

      assert.ok(response.error?.message.includes("String error"));
    });

    test("should preserve JSON-RPC error structure", async () => {
      const customError = {
        code: -32001,
        message: "Custom error",
        data: { detail: "Extra info" },
      };

      const handler = sinon.fake(() => {
        throw customError;
      });
      registry.registerRequest("customError", handler);

      const request = createRequest(1, "customError", {});
      const response = await registry.handleRequest(request);

      assert.deepStrictEqual(response.error, customError);
    });
  });
});
