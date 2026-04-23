"use client";

import type { BlockState } from "@/lib/types";
import styles from "./ProgressBar.module.css";

interface Props {
  blocks: BlockState[];
  onJump: (id: string) => void;
  reviewed: number;
  total: number;
}

function firstWords(md: string, n = 8): string {
  const text = md
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(" ").filter(Boolean).slice(0, n);
  const out = parts.join(" ");
  return out + (text.length > out.length ? "…" : "");
}

export default function ProgressBar({ blocks, onJump, reviewed, total }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.segments} role="group" aria-label="Block progress">
        {blocks.map((b) => {
          const cls = [
            styles.segment,
            b.disposition === "pending" ? styles.pending : "",
            b.disposition === "approved" || b.disposition === "edited"
              ? styles.done
              : "",
            b.disposition === "flagged" ? styles.flagged : "",
            b.disposition === "removed" ? styles.removed : ""
          ].join(" ");
          return (
            <button
              key={b.id}
              className={cls}
              title={firstWords(b.original_markdown)}
              aria-label={`Jump to ${b.id}`}
              onClick={() => onJump(b.id)}
            >
              {b.disposition === "flagged" && <span className={styles.dot} />}
            </button>
          );
        })}
      </div>
      <div className={styles.counter}>
        <span className="mono-caps muted">
          {reviewed} / {total} blocks reviewed
        </span>
      </div>
    </div>
  );
}
