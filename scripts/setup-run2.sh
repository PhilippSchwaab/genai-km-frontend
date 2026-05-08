#!/usr/bin/env bash
# Set up the HITL frontend for Run 2.
#
# - Archives Run 1 drafts and logs into run_1/ for the §5 audit trail.
# - Copies the Run 2 wiki entries from the thesis project into data/drafts/
#   under the existing A=Pipeline, B=Agentic naming convention.
# - Writes a new study_design.json that swaps the System 1/System 2
#   blinding mapping per reviewer (R1+R3 → override; R2+R4 → default).
# - Runs the generator's dry-run so the new sessions can be eyeballed
#   before they're written.
#
# Sources and reviewer assignments stay unchanged.
#
# Run from the genai-km-frontend project root.
set -euo pipefail

THESIS_RESULTS="${THESIS_RESULTS:-${HOME}/PycharmProjects/genai-km-thesis/eval/results}"
ARTIFACTS=(CS-01 CS-02 CS-03 CS-04 CS-05 CS-06)

if [[ ! -d "${THESIS_RESULTS}" ]]; then
  echo "error: thesis results not found at ${THESIS_RESULTS}" >&2
  echo "set THESIS_RESULTS=/path/to/genai-km-thesis/eval/results to override" >&2
  exit 1
fi

# 1. Archive Run 1 drafts and logs ------------------------------------------
RUN1_DIR="run_1"
mkdir -p "${RUN1_DIR}/drafts" "${RUN1_DIR}/logs"
if compgen -G "data/drafts/draft_*.md" > /dev/null; then
  echo "→ archiving Run 1 drafts to ${RUN1_DIR}/drafts/"
  mv data/drafts/draft_*.md "${RUN1_DIR}/drafts/"
fi
if compgen -G "logs/s*.jsonl" > /dev/null || [[ -f "logs/sessions_summary.csv" ]]; then
  echo "→ archiving Run 1 logs to ${RUN1_DIR}/logs/"
  mv -f logs/s*.jsonl "${RUN1_DIR}/logs/" 2>/dev/null || true
  mv -f logs/sessions_summary.csv "${RUN1_DIR}/logs/" 2>/dev/null || true
fi
# Keep the Run 1 study config alongside its drafts/logs for audit.
if [[ -f data/study_design.json ]]; then
  cp data/study_design.json "${RUN1_DIR}/study_design.json"
fi
if [[ -f data/session_config.json ]]; then
  cp data/session_config.json "${RUN1_DIR}/session_config.json"
fi

# 2. Copy Run 2 entries -----------------------------------------------------
echo "→ copying Run 2 entries from ${THESIS_RESULTS}"
copy_one() {
  local cs="$1" arch="$2" letter="$3"
  # Match the most recent run_2_<arch>_<cs>_*/wiki_entry.md.
  local match
  match=$(ls -d "${THESIS_RESULTS}"/run_2_${arch}_${cs}_*/ 2>/dev/null | sort | tail -n1 || true)
  if [[ -z "${match}" ]]; then
    echo "  ! no run_2_${arch}_${cs}_* directory found" >&2
    return 1
  fi
  local entry="${match}wiki_entry.md"
  if [[ ! -f "${entry}" ]]; then
    echo "  ! ${entry} missing" >&2
    return 1
  fi
  cp "${entry}" "data/drafts/draft_${cs}_${letter}.md"
  echo "  ${cs}/${letter}  ←  $(basename "${match}")"
}

mkdir -p data/drafts
for cs in "${ARTIFACTS[@]}"; do
  copy_one "${cs}" pipeline A
  copy_one "${cs}" agentic  B
done

# 3. Write Run 2 study_design.json -----------------------------------------
echo "→ writing data/study_design.json with swapped Run-2 blinding"
cat > data/study_design.json <<'JSON'
{
  "system_labels": { "A": "System 1", "B": "System 2" },
  "reviewers": ["R1", "R2", "R3", "R4"],
  "assignments": {
    "R1": ["CS-01/A", "CS-04/B"],
    "R2": ["CS-04/A", "CS-01/B"],
    "R3": ["CS-02/A", "CS-05/B"],
    "R4": ["CS-06/A", "CS-03/B"]
  },
  "system_label_overrides": {
    "R1": { "A": "System 2", "B": "System 1" },
    "R3": { "A": "System 2", "B": "System 1" }
  }
}
JSON

# 4. Dry-run the generator so the user can eyeball before writing config ---
echo "→ running setup:dry to preview the new sessions"
npm run --silent setup:dry

cat <<'NOTE'

--------------------------------------------------------------------------
Dry-run complete. Confirm the blinding map above is correct, then write
the new session_config.json with:

  npm run setup

After that, start the server with:

  npm run build && npm run start

Run 1 artefacts are preserved under run_1/ for the §5 audit trail.
--------------------------------------------------------------------------
NOTE
