"use client";

import { useRef, useState } from "react";
import { Button, Frame, Text } from "./ui";

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
    if (list && list.length > 0) onFiles(Array.from(list));
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
    >
      <Frame fill={over ? "active" : "paper"} depth={compact ? "flat" : "raised"} pad={compact ? "sm" : "lg"}>
        <input
          ref={input}
          type="file"
          multiple
          accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls,.ods"
          className="hidden"
          onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
        />

        {compact ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>Add files</Button>
            <Button tone="outline" size="sm" disabled={busy} onClick={onSamples}>Sample data</Button>
          </div>
        ) : (
          <div className="text-center">
            <Text role="display" className="mx-auto max-w-lg">
              Ask your spreadsheets anything.
            </Text>
            <Text role="label" tone="mute" className="mt-4">
              Drop CSV or Excel files here — several at once is fine
            </Text>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" disabled={busy} onClick={() => input.current?.click()}>Choose files</Button>
              <Button tone="outline" size="lg" disabled={busy} onClick={onSamples}>Load sample HR data</Button>
            </div>
            <Text role="caption" className="mx-auto mt-6 max-w-md">
              Files are parsed and queried inside this browser tab. Only the column
              names and types are ever sent to the model — never your rows.
            </Text>
          </div>
        )}
      </Frame>
    </div>
  );
}
