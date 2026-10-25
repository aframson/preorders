"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toCsv } from "@/lib/csv";

/** Builds the file in the browser from rows already on the page — no extra request. */
export function DownloadCsvButton({
  filename,
  rows,
  label = "Download CSV",
}: {
  filename: string;
  rows: (string | number | null)[][];
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }}
    >
      <Download className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
