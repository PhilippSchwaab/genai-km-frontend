"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockState, FlagReason } from "@/lib/types";
import MarkdownView from "@/components/MarkdownView";
import styles from "./BlockView.module.css";

interface Props {
  state: BlockState;
  onRegisterRef: (id: string, el: HTMLDivElement | null) => void;
  onApprove: () => void;
  onSaveEdit: (nextMarkdown: string) => void;
  onFlag: (reason: FlagReason, comment?: string) => void;
  onRemove: () => void;
  onUndoRemove: () => void;
  flagReasonLabels: Record<FlagReason, string>;
}

type Overlay = "none" | "edit" | "flag";

export default function BlockView({
  state,
  onRegisterRef,
  onApprove,
  onSaveEdit,
  onFlag,
  onRemove,
  onUndoRemove,
  flagReasonLabels
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [editBuf, setEditBuf] = useState(state.current_markdown);
  const [flagReason, setFlagReason] = useState<FlagReason | "">("");
  const [flagComment, setFlagComment] = useState("");

  useEffect(() => {
    onRegisterRef(state.id, containerRef.current);
    return () => onRegisterRef(state.id, null);
  }, [onRegisterRef, state.id]);

  const dispositionMark = {
    pending: "",
    approved: "Approved",
    edited: "Edited",
    flagged: "Flagged",
    removed: "Removed"
  }[state.disposition];

  const openEdit = () => {
    setEditBuf(state.current_markdown);
    setOverlay("edit");
  };

  const openFlag = () => {
    setFlagReason(state.flag_reason ?? "");
    setFlagComment(state.flag_comment ?? "");
    setOverlay("flag");
  };

  const submitFlag = () => {
    if (!flagReason) return;
    if (flagReason === "other" && !flagComment.trim()) return;
    onFlag(flagReason, flagComment.trim() || undefined);
    setOverlay("none");
  };

  const isRemoved = state.disposition === "removed";

  return (
    <div
      ref={containerRef}
      id={`blk-${state.id}`}
      className={[
        styles.block,
        state.disposition !== "pending" ? styles.disposed : "",
        isRemoved ? styles.removed : "",
        overlay !== "none" ? styles.overlayOpen : ""
      ].join(" ")}
      data-block-id={state.id}
    >
      <div className={styles.marker}>
        <span className="mono-caps muted">
          {state.id}
          {dispositionMark ? ` · ${dispositionMark}` : ""}
          {state.flag_reason
            ? ` · ${flagReasonLabels[state.flag_reason]}`
            : ""}
        </span>
      </div>

      {overlay === "edit" ? (
        <div className={styles.editor}>
          <textarea
            value={editBuf}
            onChange={(e) => setEditBuf(e.target.value)}
            rows={Math.max(4, editBuf.split("\n").length + 1)}
            spellCheck={false}
            autoFocus
          />
          <div className={styles.editorActions}>
            <button onClick={() => setOverlay("none")}>Cancel</button>
            <button
              className="primary"
              disabled={editBuf.trim() === ""}
              onClick={() => {
                onSaveEdit(editBuf);
                setOverlay("none");
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <MarkdownView className={styles.content}>
          {state.current_markdown}
        </MarkdownView>
      )}

      {isRemoved && (
        <div className={styles.undoRow}>
          <button className={styles.undoLink} onClick={onUndoRemove}>
            Undo remove
          </button>
        </div>
      )}

      {overlay === "flag" && (
        <div className={styles.flagMenu} role="dialog" aria-label="Flag block">
          <div className={styles.flagHeader}>
            <span className="mono-caps">Flag reason</span>
          </div>
          <ul className={styles.flagList}>
            {(
              Object.entries(flagReasonLabels) as [FlagReason, string][]
            ).map(([key, label]) => (
              <li key={key}>
                <label className={styles.flagItem}>
                  <input
                    type="radio"
                    name={`flag-${state.id}`}
                    value={key}
                    checked={flagReason === key}
                    onChange={() => setFlagReason(key)}
                  />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
          {flagReason === "other" && (
            <textarea
              placeholder="Brief explanation (required)"
              value={flagComment}
              onChange={(e) => setFlagComment(e.target.value)}
              rows={3}
            />
          )}
          <div className={styles.editorActions}>
            <button onClick={() => setOverlay("none")}>Cancel</button>
            <button
              className="primary"
              disabled={
                !flagReason ||
                (flagReason === "other" && flagComment.trim() === "")
              }
              onClick={submitFlag}
            >
              Flag block
            </button>
          </div>
        </div>
      )}

      {!isRemoved && overlay === "none" && (
        <div className={styles.toolbar} role="toolbar" aria-label="Block actions">
          <button
            onClick={onApprove}
            aria-pressed={state.disposition === "approved"}
          >
            Approve
          </button>
          <button onClick={openEdit} aria-pressed={state.disposition === "edited"}>
            Edit
          </button>
          <button onClick={openFlag} aria-pressed={state.disposition === "flagged"}>
            Flag
          </button>
          <button onClick={onRemove}>Remove</button>
        </div>
      )}
    </div>
  );
}
