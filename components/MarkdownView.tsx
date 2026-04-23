import { marked } from "marked";

// Synchronous, GFM-enabled rendering. Input is authored by the operator and
// read from the local `data/` directory, so it's trusted and we don't
// sanitize. If a deployment model ever accepts untrusted markdown, pipe
// `html` through DOMPurify before injection.
marked.use({ gfm: true, breaks: false, async: false });

export default function MarkdownView({
  children,
  className
}: {
  children: string;
  className?: string;
}) {
  const html = marked.parse(children) as string;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
