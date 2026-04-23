import { marked, type Token } from "marked";
import type { Block, BlockType } from "./types";

const TOKEN_TO_BLOCK: Record<string, BlockType> = {
  paragraph: "paragraph",
  heading: "heading",
  list: "list",
  table: "table",
  code: "code",
  blockquote: "blockquote",
  hr: "thematicBreak",
  html: "html"
};

// Tokens marked returns at the top level that are NOT review units. These
// are rendered nowhere and never counted in the progress bar — the reviewer
// is asked about facts, not formatting. Extend as new formatting-only cases
// come up (e.g. orphan `html` comment blocks).
//   space — whitespace between blocks
//   def   — link reference definition (renders nothing on its own)
//   hr    — horizontal rule / thematic break (`---`): pure formatting
const NON_REVIEWABLE_TOKEN_TYPES = new Set<string>(["space", "def", "hr"]);

// A paragraph that ends in ":" (ignoring trailing markdown emphasis markers)
// is almost always a lead-in to the next structural block.
function endsInColon(md: string): boolean {
  return md.trim().replace(/[*_`~\s]+$/, "").endsWith(":");
}

// Block types that a "lead-in paragraph" can be paired with. Kept narrow
// on purpose: merging two paragraphs just because one ends in ":" would
// over-group. Lists / tables / code / quotes are the structured content
// that a lead-in paragraph clearly points at.
const STRUCTURAL_FOLLOWERS = new Set<string>([
  "list",
  "table",
  "code",
  "blockquote"
]);

/**
 * Parse markdown into top-level review blocks.
 *
 * Pipeline:
 *   1. Lex with marked (each top-level token carries its exact source `raw`).
 *   2. Drop non-reviewable tokens (whitespace, hr, link-ref defs).
 *   3. Coalesce into review units:
 *      - A run of consecutive headings absorbs the next content block, so
 *        "## Root cause\n\nA Helm upgrade …" is ONE review unit.
 *      - If that content block is a paragraph ending in ":", also absorb
 *        the next structural block (list / table / code / blockquote),
 *        because the paragraph is clearly a lead-in ("**Key behaviors:**"
 *        → the list that follows).
 *
 * A trailing run of headings with no following content remains a single
 * block (rare, but handled rather than silently dropped).
 */
export function parseBlocks(source: string): Block[] {
  const raw = marked.lexer(source) as Array<Token & { raw?: string }>;
  const reviewable = raw.filter((t) => !NON_REVIEWABLE_TOKEN_TYPES.has(t.type));

  const blocks: Block[] = [];
  let i = 0;
  while (i < reviewable.length) {
    const start = i;
    // Heading run.
    while (i < reviewable.length && reviewable[i].type === "heading") i++;
    // One content block.
    if (i < reviewable.length && reviewable[i].type !== "heading") i++;
    // Lead-in paragraph extension.
    if (i > start) {
      const last = reviewable[i - 1];
      if (
        last.type === "paragraph" &&
        endsInColon(last.raw ?? "") &&
        i < reviewable.length &&
        STRUCTURAL_FOLLOWERS.has(reviewable[i].type)
      ) {
        i++;
      }
    }
    if (i === start) {
      i++;
      continue;
    }
    const group = reviewable.slice(start, i);
    const md = group
      .map((t) => (t.raw ?? "").trim())
      .filter(Boolean)
      .join("\n\n");
    if (!md) continue;
    const contentful = group.find((t) => t.type !== "heading");
    const primaryType = contentful ? contentful.type : "heading";
    blocks.push({
      id: `block_${blocks.length}`,
      type: TOKEN_TO_BLOCK[primaryType] ?? "other",
      markdown: md
    });
  }
  return blocks;
}
