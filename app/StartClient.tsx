"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./StartClient.module.css";

interface BlindedSession {
  session_id: string;
  reviewer_id: string;
  artifact_id: string;
  system_label: string;
}

const REVIEWER_KEY = "hitl.reviewerId";
const completedKey = (reviewerId: string) =>
  `hitl.completedSessions.${reviewerId}`;

function loadCompleted(reviewerId: string): Set<string> {
  if (typeof window === "undefined" || !reviewerId) return new Set();
  try {
    const raw = window.localStorage.getItem(completedKey(reviewerId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function StartClient({
  sessions
}: {
  sessions: BlindedSession[];
}) {
  const router = useRouter();
  const [reviewerId, setReviewerId] = useState("");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = window.localStorage.getItem(REVIEWER_KEY);
    if (saved) setReviewerId(saved);
  }, []);

  const trimmedId = reviewerId.trim();

  // Reload completions when the reviewer ID changes.
  useEffect(() => {
    setCompleted(loadCompleted(trimmedId.toLowerCase()));
  }, [trimmedId]);

  // Filter the full queue down to the rows that belong to this reviewer.
  // Case-insensitive so R1 / r1 both match the config.
  const mySessions = useMemo(() => {
    if (!trimmedId) return [];
    const needle = trimmedId.toLowerCase();
    return sessions.filter((s) => s.reviewer_id.toLowerCase() === needle);
  }, [sessions, trimmedId]);

  const total = mySessions.length;
  const nextIndex = mySessions.findIndex((s) => !completed.has(s.session_id));

  const handleBegin = (sessionId: string) => {
    if (!trimmedId) return;
    window.localStorage.setItem(REVIEWER_KEY, trimmedId);
    router.push(`/review/${sessionId}`);
  };

  return (
    <div className="screen">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className="mono-caps">HITL Verification Instrument</div>
          <h1 className={styles.title}>Review session queue</h1>
          <p className="muted">
            Enter your reviewer ID, then begin the next unfinished session.
            Sessions are strictly linear — once submitted, a session cannot be
            re-opened.
          </p>
        </header>

        <section className="panel">
          <label className={styles.field}>
            <span className="mono-caps">Reviewer ID</span>
            <input
              type="text"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              placeholder="e.g. R1"
              autoFocus
            />
          </label>
        </section>

        <section className={styles.queuePanel}>
          <div className={styles.queueHeader}>
            <span className="mono-caps">Queue</span>
            <span className="mono-caps muted">
              {trimmedId ? `${completed.size} / ${total} complete` : ""}
            </span>
          </div>
          {!trimmedId ? (
            <p className={styles.done}>
              Enter your reviewer ID above to see your assigned sessions.
            </p>
          ) : mySessions.length === 0 ? (
            <p className={styles.done}>
              No sessions assigned to reviewer{" "}
              <span className={styles.badId}>{trimmedId}</span>. Check with the
              study operator.
            </p>
          ) : (
            <ol className={styles.list}>
              {mySessions.map((s, idx) => {
                const done = completed.has(s.session_id);
                const isNext = idx === nextIndex;
                const locked = !done && !isNext;
                return (
                  <li
                    key={s.session_id}
                    className={[
                      styles.row,
                      done ? styles.rowDone : "",
                      isNext ? styles.rowNext : "",
                      locked ? styles.rowLocked : ""
                    ].join(" ")}
                  >
                    <div className={styles.rowLabel}>
                      <span className="mono-caps muted">
                        Session {idx + 1} of {total}
                      </span>
                      <span className={styles.rowText}>
                        {s.system_label} &nbsp;·&nbsp; Artifact {s.artifact_id}
                      </span>
                    </div>
                    <div className={styles.rowAction}>
                      {done ? (
                        <span className="mono-caps muted">Locked</span>
                      ) : isNext ? (
                        <button
                          className="primary"
                          onClick={() => handleBegin(s.session_id)}
                        >
                          Begin session
                        </button>
                      ) : (
                        <span className="mono-caps muted">Pending</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {trimmedId && mySessions.length > 0 && nextIndex === -1 && (
            <p className={styles.done}>All sessions complete. Thank you.</p>
          )}
        </section>
      </div>
    </div>
  );
}
