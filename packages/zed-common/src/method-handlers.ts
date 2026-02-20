/**
 * Method handler registry for JSON-RPC requests and notifications
 */

import {
  type JsonRpcRequest,
  type JsonRpcNotification,
  type JsonRpcResponse,
  type JsonRpcError,
  createSuccessResponse,
  createErrorResponse,
  JsonRpcErrors,
} from './protocol-types';

export type RequestHandler = (
  params: unknown
) => Promise<unknown> | unknown;

export type NotificationHandler = (
  params: unknown
) => Promise<void> | void;

export interface HandlerRegistry {
  registerRequest(method: string, handler: RequestHandler): void;
  registerNotification(method: string, handler: NotificationHandler): void;
  hasRequestHandler(method: string): boolean;
  hasNotificationHandler(method: string): boolean;
  handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse>;
  handleNotification(notification: JsonRpcNotification): Promise<void>;
}

export class MethodHandlerRegistry implements HandlerRegistry {
  private requestHandlers = new Map<string, RequestHandler>();
  private notificationHandlers = new Map<string, NotificationHandler>();

  /**
   * Register a handler for a request method
   */
  public registerRequest(method: string, handler: RequestHandler): void {
    if (this.requestHandlers.has(method)) {
      throw new Error(`Request handler for '${method}' already registered`);
    }
    this.requestHandlers.set(method, handler);
  }

  /**
   * Register a handler for a notification method
   */
  public registerNotification(
    method: string,
    handler: NotificationHandler
  ): void {
    if (this.notificationHandlers.has(method)) {
      throw new Error(
        `Notification handler for '${method}' already registered`
      );
    }
    this.notificationHandlers.set(method, handler);
  }

  /**
   * Check if a request handler exists
   */
  public hasRequestHandler(method: string): boolean {
    return this.requestHandlers.has(method);
  }

  /**
   * Check if a notification handler exists
   */
  public hasNotificationHandler(method: string): boolean {
    return this.notificationHandlers.has(method);
  }

  /**
   * Handle a JSON-RPC request
   */
  public async handleRequest(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    const handler = this.requestHandlers.get(request.method);

    if (!handler) {
      return createErrorResponse(
        request.id,
        JsonRpcErrors.methodNotFound(request.method)
      );
    }

    try {
      const result = await Promise.resolve(handler(request.params));
      return createSuccessResponse(request.id, result);
    } catch (error) {
      return createErrorResponse(
        request.id,
        this.createErrorFromException(error)
      );
    }
  }

  /**
   * Handle a JSON-RPC notification
   */
  public async handleNotification(
    notification: JsonRpcNotification
  ): Promise<void> {
    const handler = this.notificationHandlers.get(notification.method);

    if (!handler) {
      return;
    }

    try {
      await Promise.resolve(handler(notification.params));
    } catch (error) {
      console.error(
        `Error handling notification '${notification.method}':`,
        error
      );
    }
  }

  /**
   * Convert an exception to a JSON-RPC error
   */
  private createErrorFromException(error: unknown): JsonRpcError {
    if (typeof error === 'object' && error != null) {
      const err = error as Record<string, unknown>;

      if (
        typeof err.code === 'number' &&
        typeof err.message === 'string'
      ) {
        return {
          code: err.code,
          message: err.message,
          data: err.data,
        };
      }

      if (err instanceof Error) {
        return JsonRpcErrors.internalError(err.message);
      }
    }

    return JsonRpcErrors.internalError(String(error));
  }

  /**
   * Get all registered request methods
   */
  public getRequestMethods(): string[] {
    return Array.from(this.requestHandlers.keys());
  }

  /**
   * Get all registered notification methods
   */
  public getNotificationMethods(): string[] {
    return Array.from(this.notificationHandlers.keys());
  }

  /**
   * Clear all handlers
   */
  public clear(): void {
    this.requestHandlers.clear();
    this.notificationHandlers.clear();
  }
}
