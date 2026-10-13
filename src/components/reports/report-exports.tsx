"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSV_MIME_TYPE, type CsvValue, toCsv } from "@/lib/csv";
import { formatInteger } from "@/lib/formatters";

export interface ReportExport {
  id: string;
  title: string;
  description: string;
  fileName: string;
  headers: string[];
  rows: CsvValue[][];
}

/** Builds the file in the browser and hands it to the browser's download. Nothing leaves the page. */
function downloadCsv(file: ReportExport): void {
  const csv = toCsv(
    file.headers.map((header, index) => ({
      header,
      value: (row: CsvValue[]) => row[index],
    })),
    file.rows,
  );
  const url = URL.createObjectURL(new Blob([csv], { type: CSV_MIME_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Let the browser start reading the file before the URL is released.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** One button per report table. The status line reports only what actually happened. */
export function ReportExports({
  files,
  currency,
}: {
  files: readonly ReportExport[];
  currency: string;
}) {
  const [status, setStatus] = useState("");

  return (
    <section
      aria-labelledby="exports-title"
      data-pending-region=""
      className="rounded-xl border border-line bg-surface p-5 sm:p-6 lg:col-span-12"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="exports-title" className="text-base font-semibold text-ink">
          Export as CSV
        </h2>
        <p className="text-sm text-ink-muted">
          Generated in your browser from the preview below. Amounts in{" "}
          {currency}; nothing is uploaded.
        </p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-line p-4 sm:flex-col sm:items-start sm:justify-start"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <FileSpreadsheet
                  aria-hidden
                  className="size-4 text-accent-ink"
                />
                {file.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                {formatInteger(file.rows.length)} rows · {file.headers.length}{" "}
                columns
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 sm:mt-auto"
              aria-label={`Download ${file.title} as CSV`}
              onClick={() => {
                try {
                  downloadCsv(file);
                  setStatus(
                    `Created ${file.fileName} with ${formatInteger(file.rows.length)} rows and started the download.`,
                  );
                } catch {
                  setStatus(
                    `${file.title} could not be downloaded in this browser. Nothing was saved.`,
                  );
                }
              }}
            >
              <Download aria-hidden />
              <span className="max-sm:sr-only">Download </span>CSV
            </Button>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-3 min-h-5 text-sm text-ink-muted">
        {status}
      </p>
    </section>
  );
}
