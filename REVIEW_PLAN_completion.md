# Run 2 Completion Reviews — Session Plan

**Goal:** complete Accuracy and Verification Effort measurements for all six Control Set
artifacts (previously only CS-01 and CS-04 were reviewed), so the MCDA compares all
criteria over the full artifact set. Every (artifact × system) cell is reviewed by **both**
reviewers, which additionally enables inter-rater agreement analysis.

## Setup

```bash
npm run build && npm run start   # do NOT run "npm run setup" — see data/study_design.json _note
```

Reviewers enter their ID (R1 / R2) on the start page as before. Sessions s001–s004 are
already completed; the new sessions appear as pending in the queue.

## Session order (please follow top to bottom)

### R1
| # | Session | Artifact | Shown as |
|---|---------|----------|----------|
| 1 | s009 | CS-02 | System 2 |
| 2 | s010 | CS-03 | System 1 |
| 3 | s011 | CS-05 | System 2 |
| 4 | s012 | CS-06 | System 1 |
| 5 | s013 | CS-02 | System 1 |
| 6 | s014 | CS-03 | System 2 |
| 7 | s015 | CS-05 | System 1 |
| 8 | s016 | CS-06 | System 2 |

### R2
| # | Session | Artifact | Shown as |
|---|---------|----------|----------|
| 1 | s017 | CS-02 | System 2 |
| 2 | s018 | CS-03 | System 1 |
| 3 | s019 | CS-05 | System 2 |
| 4 | s020 | CS-06 | System 1 |
| 5 | s021 | CS-02 | System 1 |
| 6 | s022 | CS-03 | System 2 |
| 7 | s023 | CS-05 | System 1 |
| 8 | s024 | CS-06 | System 2 |

## Design notes (for the thesis audit trail)

- **Full crossing:** R1 and R2 each review all four remaining artifacts under both
  architectures (16 sessions total). Every cell has two independent reviews.
- **Counterbalancing:** each reviewer alternates architectures; the two sessions on the
  same artifact are separated by four other sessions; each cell is reviewed once early
  and once late across the two reviewers (position balance).
- **Blinding:** unchanged Run-2 mapping — R1 sees A as "System 2"/B as "System 1",
  R2 sees A as "System 1"/B as "System 2". Reviewers should not be told which system
  is which until all 16 sessions are submitted.
- **Carryover caveat:** unlike s001–s004, each reviewer now sees the same artifact twice
  (once per system). The second pass on an artifact benefits from source familiarity, so
  time-on-task for second passes may be depressed. The position balance spreads this
  effect equally across both architectures; it should still be noted in the limitations.
- **Abandoned plan:** session IDs s005–s008 were reserved for reviewers R3/R4 who never
  participated; the IDs are intentionally skipped. An orphaned partial log was archived
  to `logs/orphaned/`.

## After completion

Aggregate as usual:

```bash
cd ../genai-km-thesis
python eval/run_mcda.py --frontend ../genai-km-frontend
```
