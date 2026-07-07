# HITL Verification UI

Local Next.js instrument for blinded, within-subjects review of AI-generated wiki drafts against their source artifacts.

Completed studies are archived per run (`run_1/`, `run_2/`: session configs plus logs); the live `logs/` directory is git-ignored. Run 2 comprises an initial stage (s001–s004) and a completion stage with full reviewer crossing (s009–s024); s005–s008 are intentionally unused.

## Requirements

- Node.js 20+ and npm

## Install, build, run

```bash
npm install
npm run build
npm run start            # http://localhost:3000
# or: npm run start -- --port 3001
```

For iteration only: `npm run dev` (adds the Next.js dev overlay — avoid for real reviewer sessions).

## Setting up review sessions

1. Drop the pipeline's output into `data/` using this naming convention:

   ```
   data/
     drafts/    draft_{ARTIFACT}_{A|B}.md   # one per (artifact, architecture)
     sources/   {ARTIFACT}.md               # the reference material
   ```

2. Describe the study in `data/study_design.json` (see `data/study_design.example.json`):

   ```json
   {
     "system_labels": { "A": "System 1", "B": "System 2" },
     "reviewers": ["R1", "R2", "R3"],
     "assignments": {
       "R1": ["CS-01/A", "CS-04/B"],
       "R2": ["CS-04/A", "CS-01/B"],
       "R3": ["CS-02/A", "CS-05/B"]
     }
   }
   ```

   Each assignment cell is `ARTIFACT_ID/ARCH` (A or B). Reviewer keys in `assignments` must match the `reviewers` list. Use `system_label_overrides` if you need to swap System 1 / System 2 for a specific reviewer.

3. Generate `session_config.json`:

   ```bash
   npm run setup            # validate + write
   npm run setup:dry        # preview without writing
   ```

   The generator (a) auto-numbers sessions (`s001`, `s002`, …), (b) resolves draft/source file paths, (c) fails loudly with a list if any referenced file is missing, and (d) prints a blinding map per reviewer so you can eyeball that `System 1/2` is assigned correctly.

   > **Warning:** the generator renumbers sessions from `s001`. Never re-run
   > `npm run setup` once sessions have been submitted — it breaks the
   > `session_id` join with `logs/sessions_summary.csv`. To add sessions to a
   > live study, append rows to `data/session_config.json` manually (see the
   > `_note` in `data/study_design.json` and `REVIEW_PLAN_completion.md` for
   > the Run-2 completion-stage example).

4. `npm run build && npm run start` and hand off the URL (or folder, for same-OS handoff).

### Reviewer-scoped queue

The start screen filters the queue by the reviewer ID typed into the ID field, so each reviewer only sees their own sessions (case-insensitive). Completion state in localStorage is keyed per reviewer, so multiple reviewers can safely share one machine or browser profile.

## Remote reviewers (optional)

For reviewers outside your LAN, expose the local server over an HTTPS tunnel. Logs still land on your machine — the tunnel only proxies HTTP.

One-time install of `cloudflared`:

```bash
brew install cloudflared                     # macOS
# Linux:   https://pkg.cloudflare.com/ (apt/yum/rpm)
# Windows: winget install --id Cloudflare.cloudflared
```

Start the server in one terminal, the tunnel in another:

```bash
# terminal 1
npm run build && npm run start

# terminal 2
npm run tunnel                               # prints https://*.trycloudflare.com
# or: PORT=3001 npm run tunnel
```

Share the printed URL with the reviewer; stop the tunnel with Ctrl-C. The URL changes each restart. `ngrok http 3000` works identically if you prefer it.

### Protecting the tunnel with basic auth (recommended for remote use)

A quick tunnel's URL is effectively a secret — but if one reviewer forwards it, anyone can submit bogus events. Turn on HTTP basic auth by setting `HITL_BASIC_AUTH` before starting the server:

```bash
cp .env.example .env.local
# edit .env.local → set HITL_BASIC_AUTH=reviewer:choose-a-password
npm run build && npm run start
```

Every page and API route then requires the credentials (the browser prompts on first visit and caches them). Give the reviewer the username + password out-of-band (Signal, email, etc.). Leave the env var unset for LAN / local use — no prompt.

Only use basic auth behind HTTPS, which Cloudflare Tunnel provides end-to-end.

Do **not** deploy to Vercel / serverless — the app writes JSONL + CSV to the local filesystem, which ephemeral serverless filesystems silently drop. For real cloud hosting, use a VPS with a persistent volume.

## Outputs

Written to `logs/` as the reviewer works:

- `logs/{session_id}.jsonl` — full event trace (`session_start`, `block_disposition`, `edit`, `block_jump`, `pane_focus`, `likert_submit`, `session_end`).
- `logs/sessions_summary.csv` — one row appended per submitted session (counts by disposition, flag-reason tallies, total time, edit distance, Likert scores).

The UI is read-only on `data/` and write-only on `logs/`.

## Reviewer flow

1. Start screen → type reviewer ID → "Begin session" on the next unfinished row.
2. Review screen → disposition every block (Approve / Edit / Flag / Remove) → "Submit final" once the counter reads N / N.
3. Debrief → two 7-point Likert scales + optional comment → "Submit and continue".
4. Next session unlocks; submitted sessions are locked.

Sessions are strictly linear. The timer pauses on browser blur so window-switching does not inflate time-on-task.
