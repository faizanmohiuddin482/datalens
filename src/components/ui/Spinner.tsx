import Text from "./Text";

/** Progress as a named stage plus a chunked bar — never a smooth sweep. */
export default function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="chunked h-2.5 w-16 border-2 border-ink" />
      <Text as="span" role="label" tone="mute"><span role="status">{label}…</span></Text>
    </div>
  );
}
