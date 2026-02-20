#!/usr/bin/env node

/**
 * CLI entry point for the Cursorless-Zed engine wrapper.
 *
 * Spawned by the Zed extension via: node cli.cjs
 * Communicates over stdin/stdout using JSON-RPC 2.0.
 */

import { EngineWrapper } from "./engine-wrapper";

async function main() {
  const wrapper = new EngineWrapper({
    engineVersion: process.env.CURSORLESS_ENGINE_VERSION ?? "0.0.0-dev",
    debug: process.env.CURSORLESS_DEBUG === "1",
  });

  await wrapper.start();
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
