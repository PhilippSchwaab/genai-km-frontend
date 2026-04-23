export type ArchitectureInternal = "A" | "B";

export interface SessionConfig {
  session_id: string;
  reviewer_id: string;
  artifact_id: string;
  system_label: string;
  architecture_internal: ArchitectureInternal;
  draft_path: string;
  source_path: string;
}

export type BlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "table"
  | "code"
  | "blockquote"
  | "thematicBreak"
  | "html"
  | "other";

export interface Block {
  id: string;
  type: BlockType;
  markdown: string;
}

export type Disposition = "approved" | "edited" | "flagged" | "removed";

export type FlagReason =
  | "factual_error"
  | "missing_information"
  | "wrong_or_missing_attribution"
  | "stylistic_or_formatting_only"
  | "other";

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  factual_error: "Factual error",
  missing_information: "Missing information",
  wrong_or_missing_attribution: "Wrong or missing attribution",
  stylistic_or_formatting_only: "Stylistic or formatting only",
  other: "Other"
};

export interface BlockState {
  id: string;
  type: BlockType;
  original_markdown: string;
  current_markdown: string;
  disposition: Disposition | "pending";
  flag_reason?: FlagReason;
  flag_comment?: string;
}

export type EventType =
  | "session_start"
  | "session_end"
  | "edit"
  | "block_disposition"
  | "block_jump"
  | "pane_focus"
  | "likert_submit";

export interface LogEvent {
  session_id: string;
  reviewer_id: string;
  artifact_id: string;
  system_label: string;
  event_type: EventType;
  timestamp_ms: number;
  payload: Record<string, unknown>;
}

export interface LikertSubmission {
  confidence: number; // 1-7
  effort: number; // 1-7
  comment?: string;
}
