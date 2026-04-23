"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./DebriefClient.module.css";

interface BlindedSession {
  session_id: string;
  reviewer_id: string;
  artifact_id: string;
  system_label: string;
}

const completedKey = (reviewerId: string) =>
  `hitl.completedSessions.${reviewerId.toLowerCase()}`;

const LIKERT_VALUES = [1, 2, 3, 4, 5, 6, 7];

function LikertRow({
  label,
  left,
  right,
  value,
  onChange
}: {
  label: string;
  left: string;
  right: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className={styles.likert}>
      <div className={styles.likertLabel}>{label}</div>
      <div className={styles.likertScale} role="radiogroup" aria-label={label}>
        <span className="mono-caps muted">{left}</span>
        <div className={styles.likertOptions}>
          {LIKERT_VALUES.map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={value === v}
              className={[
                styles.likertButton,
                value === v ? styles.likertSelected : ""
              ].join(" ")}
              onClick={() => onChange(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="mono-caps muted">{right}</span>
      </div>
    </div>
  );
}

export default function DebriefClient({ session }: { session: BlindedSession }) {
  const router = useRouter();
  const [confidence, setConfidence] = useState<number | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    confidence != null && effort != null && !submitting;

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const stashKey = `hitl.review.${session.session_id}`;
      const stashed = window.sessionStorage.getItem(stashKey);
      if (!stashed) {
        throw new Error("No review payload found for this session");
      }
      const review = JSON.parse(stashed) as {
        reviewer_id?: string;
        started_at_ms: number;
        submitted_at_ms: number;
        active_duration_ms: number;
        blocks: unknown[];
      };
      // Prefer the reviewer_id stashed by the review screen; fall back to
      // whatever was typed on the start screen (in case the stash lost it).
      const reviewerId =
        review.reviewer_id ||
        window.localStorage.getItem("hitl.reviewerId") ||
        undefined;
      const res = await fetch(`/api/session/${session.session_id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...review,
          reviewer_id: reviewerId,
          likert: { confidence, effort, comment }
        })
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(err?.error ?? "Submit failed");
      }
      // Mark session complete locally so the start screen locks it. Keyed
      // by reviewer so multiple reviewers on one machine stay separate.
      try {
        window.sessionStorage.removeItem(stashKey);
        const keyReviewer =
          reviewerId ||
          window.localStorage.getItem("hitl.reviewerId") ||
          session.reviewer_id;
        const key = completedKey(keyReviewer);
        const raw = window.localStorage.getItem(key);
        const arr = (raw ? JSON.parse(raw) : []) as string[];
        if (!arr.includes(session.session_id)) arr.push(session.session_id);
        window.localStorage.setItem(key, JSON.stringify(arr));
      } catch {
        /* non-fatal */
      }
      router.push("/");
    } catch (err) {
      alert((err as Error).message);
      setSubmitting(false);
    }
  }, [canSubmit, comment, confidence, effort, router, session.session_id]);

  return (
    <div className="screen">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className="mono-caps">Post-review</div>
          <h1 className={styles.title}>
            {session.system_label} &nbsp;·&nbsp; Artifact {session.artifact_id}
          </h1>
          <p className="muted">
            Two short questions before the next session. No correct answer —
            rate however feels right.
          </p>
        </header>

        <section className="panel">
          <LikertRow
            label="How confident are you in the final approved version?"
            left="Not at all"
            right="Completely"
            value={confidence}
            onChange={setConfidence}
          />
          <div className="divider" style={{ margin: "var(--space-4) 0" }} />
          <LikertRow
            label="How much effort did this review require?"
            left="Very little"
            right="A great deal"
            value={effort}
            onChange={setEffort}
          />
          <div className="divider" style={{ margin: "var(--space-4) 0" }} />
          <label className={styles.commentField}>
            <span className="mono-caps">Comment (optional)</span>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything you'd like to note about this session."
            />
          </label>
        </section>

        <div className={styles.actions}>
          <button
            className="primary"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {submitting ? "Submitting…" : "Submit and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
