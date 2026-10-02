/** The shop's log lines. Tests pass `silentLog`. */
export interface Log {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const consoleLog: Log = {
  info: (message) => console.log(`[shop] ${message}`),
  warn: (message) => console.warn(`[shop] ${message}`),
  error: (message) => console.error(`[shop] ${message}`),
};

export const silentLog: Log = { info() {}, warn() {}, error() {} };

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
