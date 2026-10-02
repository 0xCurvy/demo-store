/**
 * The Payments SDK's Rust core, compiled to WASM. In Node the SDK reads the file from disk; here the bundler hands
 * us the compiled module and we initialise the shared glue before the SDK's first use. The SDK then finds the core
 * already loaded (see patches/@0xcurvy__payments-sdk).
 */
import initRustCore from "@0xcurvy/rs-core-wasm/core";
import coreModule from "@0xcurvy/rs-core-wasm/core/curvy_wasm_bg.wasm";

let ready: Promise<void> | undefined;

export function rustCoreReady(): Promise<void> {
  ready ??= initRustCore({ module_or_path: coreModule }).then(() => undefined);

  return ready;
}
