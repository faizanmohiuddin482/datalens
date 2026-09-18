"use client";

import { useRef, useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  onSamples: () => void;
  busy: boolean;
  compact: boolean;
}

export default function Uploader({ onFiles, onSamples, busy, compact }: Props) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function pick(list: FileList | null) {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      className={`rounded-xl border border-dashed transition-colors ${
        over ? "border-accent bg-accent-soft" : "border-border bg-surface"
      } ${compact ? "p-4" : "p-8 sm:p-12"}`}
    >
      <input
        ref={input}
        type="file"
        multiple
        accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls,.ods"
        className="hidden"
        onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
      />

      <div className={compact ? "flex flex-wrap items-center gap-3" : "text-center"}>
        {!compact && (
          <p className="text-sm text-muted mb-4">
            Drop CSV or Excel files here — several at once is fine.
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:opacity-90"
        >
          {compact ? "Add files" : "Choose files"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSamples}
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50 hover:bg-background ml-3"
        >
          Load sample HR data
        </button>
        {!compact && (
          <p className="mt-5 text-xs text-muted">
            Files are parsed and queried inside this browser tab. Only the column
            names and types are ever sent to the model — never your rows.
          </p>
        )}
      </div>
    </div>
  );
}
