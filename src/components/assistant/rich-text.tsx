/**
 * Markdown mínimo para las respuestas del asistente: párrafos, listas con "- " y
 * **negritas**. Se construye con elementos de React (nunca innerHTML), así que el
 * texto que llega de la IA no puede inyectar HTML.
 */
export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    if (line) blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
  }
  flushList();

  return <div className="flex flex-col gap-2">{blocks}</div>;
}

function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}
