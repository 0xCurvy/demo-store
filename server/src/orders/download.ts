/**
 * The download link a paid order gets: a random token the shop knows only from the order, good for one full
 * download within a window. A download that breaks off does not use the link up; only a finished one does.
 */
import { randomBytes } from "node:crypto";

export interface Download {
  /** 32 random bytes as hex. The link `/download/<token>` is the only place it appears. */
  token: string;
  issuedAt: string;
  expiresAt: string;
  /** Set once the whole file has been sent. The link works once. */
  downloadedAt: string | null;
}

/** How long a paid order's link stays open. */
export const DOWNLOAD_WINDOW_MS = 7 * 86_400_000;

const TOKEN = /^[0-9a-f]{64}$/;

export function issueDownload(now: Date): Download {
  return {
    token: randomBytes(32).toString("hex"),
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DOWNLOAD_WINDOW_MS).toISOString(),
    downloadedAt: null,
  };
}

export function isDownloadToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN.test(value);
}

/** Why the link cannot be used now, or null when it can. */
export function downloadProblem(download: Download, now: Date): "used" | "expired" | null {
  if (download.downloadedAt !== null) return "used";

  if (Date.parse(download.expiresAt) <= now.getTime()) return "expired";

  return null;
}
