"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Block, BlockState, FlagReason } from "@/lib/types";
import { FLAG_REASON_LABELS } from "@/lib/types";
import MarkdownView from "@/components/MarkdownView";
import BlockView from "./BlockView";
import ProgressBar from "./ProgressBar";
import styles from "./ReviewClient.module.css";

interface BlindedSession {
  session_id: string;
  reviewer_id: string;
  artifact_id: string;
  system_label: string;
}

type PaneId = "source" | "draft";

export default function ReviewClient({
  session,
  sourceMarkdown,
  blocks: initialBlocks
}: {
  session: BlindedSession;
  sourceMarkdown: string;
  blocks: Block[];
}) {
  const router = useRouter();

  // ---- session lifecycle ----
  const startedAtRef = useRef<number>(Date.now());
  const activeMsRef = useRef<number>(0);
  const lastActiveStampRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);
  const sessionStartLoggedRef = useRef<boolean>(false);
  const reviewerIdRef = useRef<string>(session.reviewer_id);

  // ---- block state ----
  const [states, setStates] = useState<BlockState[]>(() =>
    initialBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      original_markdown: b.markdown,
      current_markdown: b.markdown,
      disposition: "pending"
    }))
  );

  // ---- focus tracking ----
  const [activePane, setActivePane] = useState<PaneId>("draft");

  // ---- submit state ----
  const [submitting, setSubmitting] = useState(false);

  // ---- elapsed timer display ----
  const [elapsedSec, setElapsedSec] = useState(0);

  const postEvent = useCallback(
    (event_type: string, payload: Record<string, unknown> = {}) => {
      void fetch(`/api/session/${session.session_id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type,
          timestamp_ms: Date.now(),
          reviewer_id: reviewerIdRef.current,
          payload
        }),
        keepalive: true
      });
    },
    [session.session_id]
  );

  // Read the reviewer ID typed on the start screen (falls back to config).
  // Deferred to effect so SSR/CSR markup matches.
  useEffect(() => {
    try {
      const typed = window.localStorage.getItem("hitl.reviewerId");
      if (typed && typed.trim()) reviewerIdRef.current = typed.trim();
    } catch {
      /* ignore */
    }
  }, []);

  // Log session_start once on mount.
  useEffect(() => {
    if (sessionStartLoggedRef.current) return;
    sessionStartLoggedRef.current = true;
    postEvent("session_start", {
      started_at_ms: startedAtRef.current
    });
  }, [postEvent]);

  // Pause timer on blur, resume on focus.
  useEffect(() => {
    const freeze = () => {
      if (!isActiveRef.current) return;
      activeMsRef.current += Date.now() - lastActiveStampRef.current;
      isActiveRef.current = false;
    };
    const thaw = () => {
      if (isActiveRef.current) return;
      lastActiveStampRef.current = Date.now();
      isActiveRef.current = true;
    };
    const onVis = () => {
      if (document.hidden) freeze();
      else thaw();
    };
    window.addEventListener("blur", freeze);
    window.addEventListener("focus", thaw);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", freeze);
      window.removeEventListener("focus", thaw);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Tick display once a second.
  useEffect(() => {
    const id = window.setInterval(() => {
      const active =
        activeMsRef.current +
        (isActiveRef.current ? Date.now() - lastActiveStampRef.current : 0);
      setElapsedSec(Math.floor(active / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  // --- pane focus tracking ---
  const setPane = useCallback(
    (pane: PaneId) => {
      setActivePane((prev) => {
        if (prev === pane) return prev;
        postEvent("pane_focus", { pane });
        return pane;
      });
    },
    [postEvent]
  );

  // --- block mutators ---
  const updateBlock = useCallback(
    (id: string, updater: (b: BlockState) => BlockState) => {
      setStates((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
    },
    []
  );

  const approveBlock = useCallback(
    (id: string) => {
      updateBlock(id, (b) => ({
        ...b,
        disposition: "approved",
        flag_reason: undefined,
        flag_comment: undefined
      }));
      postEvent("block_disposition", { block_id: id, disposition: "approve" });
    },
    [postEvent, updateBlock]
  );

  const saveEdit = useCallback(
    (id: string, next: string, before: string) => {
      updateBlock(id, (b) => ({
        ...b,
        current_markdown: next,
        disposition: "edited",
        flag_reason: undefined,
        flag_comment: undefined
      }));
      postEvent("edit", {
        block_id: id,
        diff: { before, after: next }
      });
      postEvent("block_disposition", { block_id: id, disposition: "edit" });
    },
    [postEvent, updateBlock]
  );

  const flagBlock = useCallback(
    (id: string, reason: FlagReason, comment?: string) => {
      updateBlock(id, (b) => ({
        ...b,
        disposition: "flagged",
        flag_reason: reason,
        flag_comment: comment
      }));
      postEvent("block_disposition", {
        block_id: id,
        disposition: "flag",
        flag_reason: reason,
        flag_comment: comment ?? ""
      });
    },
    [postEvent, updateBlock]
  );

  const removeBlock = useCallback(
    (id: string) => {
      updateBlock(id, (b) => ({
        ...b,
        disposition: "removed",
        flag_reason: undefined,
        flag_comment: undefined
      }));
      postEvent("block_disposition", { block_id: id, disposition: "remove" });
    },
    [postEvent, updateBlock]
  );

  const undoRemoveBlock = useCallback(
    (id: string) => {
      updateBlock(id, (b) => ({
        ...b,
        disposition: "pending",
        flag_reason: undefined,
        flag_comment: undefined
      }));
      postEvent("block_disposition", {
        block_id: id,
        disposition: "undo_remove"
      });
    },
    [postEvent, updateBlock]
  );

  // --- progress bar interaction ---
  const draftPaneRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const registerBlockRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) blockRefs.current.set(id, el);
      else blockRefs.current.delete(id);
    },
    []
  );

  const [lastFocusedBlock, setLastFocusedBlock] = useState<string | null>(null);
  const jumpToBlock = useCallback(
    (toId: string) => {
      const el = blockRefs.current.get(toId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      postEvent("block_jump", {
        from_block_id: lastFocusedBlock,
        to_block_id: toId
      });
      setLastFocusedBlock(toId);
    },
    [lastFocusedBlock, postEvent]
  );

  const reviewedCount = useMemo(
    () => states.filter((s) => s.disposition !== "pending").length,
    [states]
  );
  const total = states.length;
  const canSubmit = reviewedCount === total && !submitting;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setSubmitting(true);
    const now = Date.now();
    const active =
      activeMsRef.current +
      (isActiveRef.current ? now - lastActiveStampRef.current : 0);
    // Stash the review payload. The final /submit call (with Likert values)
    // happens from the debrief screen so the CSV row is atomic.
    window.sessionStorage.setItem(
      `hitl.review.${session.session_id}`,
      JSON.stringify({
        reviewer_id: reviewerIdRef.current,
        started_at_ms: startedAtRef.current,
        submitted_at_ms: now,
        active_duration_ms: active,
        blocks: states
      })
    );
    router.push(`/debrief/${session.session_id}`);
  }, [canSubmit, router, session.session_id, states]);

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <span className={styles.systemLabel}>{session.system_label}</span>
          <span className={styles.sep}>·</span>
          <span className="mono-caps">Artifact {session.artifact_id}</span>
        </div>
        <div className={styles.topRight}>
          <span className="mono-caps muted">Elapsed</span>
          <span className={styles.timer}>{mmss(elapsedSec)}</span>
        </div>
      </header>

      <div className={styles.progressBar}>
        <ProgressBar
          blocks={states}
          onJump={jumpToBlock}
          reviewed={reviewedCount}
          total={total}
        />
      </div>

      <main className={styles.panes}>
        <section
          className={[
            styles.pane,
            styles.sourcePane,
            activePane === "source" ? styles.paneActive : ""
          ].join(" ")}
          onMouseEnter={() => setPane("source")}
          onFocus={() => setPane("source")}
        >
          <div className={styles.paneHeader}>
            <span className="mono-caps">Source — {session.artifact_id}</span>
          </div>
          <div className={styles.paneScroll}>
            <MarkdownView className={styles.prose}>
              {sourceMarkdown}
            </MarkdownView>
          </div>
        </section>

        <section
          ref={draftPaneRef}
          className={[
            styles.pane,
            styles.draftPane,
            activePane === "draft" ? styles.paneActive : ""
          ].join(" ")}
          onMouseEnter={() => setPane("draft")}
          onFocus={() => setPane("draft")}
        >
          <div className={styles.paneHeader}>
            <span className="mono-caps">AI-generated draft</span>
          </div>
          <div className={styles.paneScroll}>
            <div className={styles.prose}>
              {states.map((s) => (
                <BlockView
                  key={s.id}
                  state={s}
                  onRegisterRef={registerBlockRef}
                  onApprove={() => approveBlock(s.id)}
                  onSaveEdit={(next) =>
                    saveEdit(s.id, next, s.current_markdown)
                  }
                  onFlag={(reason, comment) => flagBlock(s.id, reason, comment)}
                  onRemove={() => removeBlock(s.id)}
                  onUndoRemove={() => undoRemoveBlock(s.id)}
                  flagReasonLabels={FLAG_REASON_LABELS}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.bottomBar}>
        <span className="mono-caps muted">
          {reviewedCount} / {total} blocks reviewed
        </span>
        <button
          className="primary"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting…" : "Submit final"}
        </button>
      </footer>
    </div>
  );
}
