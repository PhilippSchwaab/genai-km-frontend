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

// Tokens marked returns at the top level that are not review units:
// `space` is pure whitespace between blocks; `def` is a link reference
// definition that renders nothing on its own.
const SKIP = new Set<string>(["space", "def"]);

/**
 * Parse markdown into top-level blocks. Uses marked's lexer, which
 * returns each top-level token with a `raw` field containing the exact
 * source substring — so whitespace, fence markers, and list syntax are
 * preserved verbatim.
 */
export function parseBlocks(source: string): Block[] {
  const tokens: Token[] = marked.lexer(source);
  const blocks: Block[] = [];
  let i = 0;
  for (const tok of tokens) {
    if (SKIP.has(tok.type)) continue;
    const md = (tok as Token & { raw?: string }).raw;
    if (!md) continue;
    blocks.push({
      id: `block_${i}`,
      type: TOKEN_TO_BLOCK[tok.type] ?? "other",
      markdown: md
    });
    i++;
  }
  return blocks;
}
