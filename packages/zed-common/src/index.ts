/**
 * Cursorless Engine Wrapper for Zed
 *
 * This package provides a JSON-RPC wrapper around the Cursorless engine
 * to enable communication with the Zed extension via stdio.
 */

export { EngineWrapper, type EngineWrapperConfig } from './engine-wrapper';
export {
  MethodHandlerRegistry,
  type RequestHandler,
  type NotificationHandler,
  type HandlerRegistry,
} from './method-handlers';
export {
  parseMessage,
  serializeMessage,
  isRequest,
  isResponse,
  isNotification,
  LineBuffer,
  MessageStream,
  type ParseResult,
  type ParseError,
  type ParsedMessage,
} from './message-parser';
export * from './protocol-types';
