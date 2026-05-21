"use client";

import { useEffect, useId, useRef, useState } from "react";

type MermaidDiagramProps = {
  source: string;
};

/** Renders Mermaid syntax returned by the mind_map AI task. */
export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!containerRef.current || !source.trim()) return;

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
        });

        const { svg } = await mermaid.render(
          `migiude-${uniqueId}`,
          source.trim(),
        );

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not render diagram",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, uniqueId]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
        {source}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-lg bg-white p-2 dark:bg-zinc-900 [&_svg]:max-w-full"
    />
  );
}
