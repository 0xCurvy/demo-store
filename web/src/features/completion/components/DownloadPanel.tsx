import type { DownloadView } from "@api";
import { formatDateTime } from "@/shared/lib/format";

/** The one-time link to the 4K file, and what became of it. */
export function DownloadPanel({ download }: { download: DownloadView }) {
  if (download.downloadedAt) {
    return (
      <p className="leading-relaxed">
        <span className="font-semibold">Downloaded</span> on {formatDateTime(download.downloadedAt)}
        . The link has done its one job and no longer works.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href={download.url}
        download
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-ink px-5 font-semibold text-sheet transition-[translate,box-shadow] duration-150 hover:-translate-0.5 hover:shadow-print-red"
      >
        Download the 4K file
      </a>
      <p className="text-sm leading-relaxed text-ink-muted">
        This link works once, until {formatDateTime(download.expiresAt)}. If the download breaks
        off, try it again: the link stays open until the whole file has arrived.
      </p>
    </div>
  );
}
