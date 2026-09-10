# Unclosed

**Find the work you left open.**

Unclosed runs entirely on your computer. It scans local folders you explicitly mount as read-only and surfaces deterministic evidence of unfinished or fading work.

**No AI. No cloud. No account. No telemetry.**

A travel checklist, a budget with placeholders, an article draft, a research folder: they all belong here. No Git integration or developer workflow is required. You decide whether something is actually finished.

## Quick start

Prerequisites: Docker with Docker Compose v2. Git is only needed to clone the repository.

```bash
git clone https://github.com/m0vntain/unclosed.git
cd unclosed
./unclosed start ~/Documents ~/Projects
```

Open [localhost:3000](http://localhost:3000), then click **Scan now**. The first build downloads dependencies; subsequent normal use works offline. The image includes the application, Node, and SQLite. No application-specific host dependencies or API keys are required.

On Windows, from PowerShell:

```powershell
.\unclosed.ps1 start "$HOME\Documents" "C:\Projects"
```

If your PowerShell policy prevents local scripts, use the Compose fallback below, or review and invoke the local script with `powershell -ExecutionPolicy Bypass -File .\unclosed.ps1 start "C:\YourFolder"`. This affects that invocation only.

### Try the example workspace

```bash
docker compose up --build -d --wait
```

This mounts `example-workspace/` read-only. Its first sweep discovers five work items and surfaces four: Japan trip planning, a home renovation checklist, an article draft, and expenses. The clean folder remains in **All scanned**, without a loose-end warning. No activity history is fabricated for the examples; Fading develops only after actual observations over time.

To choose a single folder through the Compose fallback:

```bash
UNCLOSED_FOLDER_1="$HOME/Documents" docker compose up --build -d --wait
```

PowerShell equivalent:

```powershell
$env:UNCLOSED_FOLDER_1 = "$HOME\Documents"
docker compose up --build -d --wait
```

The fallback derives a label and a stable hash from the configured source; it sends only the label and container path to the browser. Use the wrapper for multiple folders and canonical folder identities when mount order changes. Docker must have permission to share each chosen folder. Missing host folders cause an error rather than being created automatically.

## Everyday use

- **Radar** groups loose ends into Needs Attention, Fading, and Still Active. Search by file or folder name and evidence title; filter by location or file/folder; sort by relevance, name, or modification time.
- **Take a look** opens evidence, filenames, line numbers, spreadsheet cells, observed scan history, tracked file metadata, and the score breakdown.
- **Mark closed** records your decision and the current snapshot. It never changes your files. A later addition, modification, or removal inside an existing work item brings it back with “Changed since you marked this closed.” The original close event remains in history.
- **Snooze** hides an item until tomorrow, one week, one month, or a custom date. It returns automatically when the date passes and the app is next used. Browse snoozed items with the Snoozed filter.
- **Take off radar** hides an item from normal results. Visit Off the Radar to bring it back. Ignored files still receive observations during a sweep, so their history stays useful if restored.
- **All scanned** includes clean, snoozed, closed, ignored, and unavailable items in currently mounted locations. Missing items retain their last evidence and are excluded from normal Radar results.
- **Settings** shows read-only mount paths, local storage details, and how to change locations. Full host paths are not sent to the browser.

Scans are on demand. No watchers, daemon, cron jobs, notifications, or automatic scanning are installed. Closing the browser does not cancel an active sweep; use its Cancel button if needed. Item actions wait until the sweep finishes to keep closed-snapshot comparisons consistent.

### Lifecycle commands

```bash
./unclosed start ~/Documents ~/Projects  # configure folders and start
./unclosed start                        # reuse the last folder configuration
./unclosed stop
./unclosed restart
./unclosed logs
./unclosed status
```

Windows uses the same commands with `.\unclosed.ps1`. The wrapper writes `.unclosed/compose.json` and never modifies the committed Compose file. This generated file contains the host mount paths and is excluded from Git. Use the same wrapper for subsequent lifecycle commands once configured. Changing folders keeps previous database history; items from locations no longer mounted are hidden. Avoid mounting a folder both directly and through an ancestor, which creates duplicate observations.

## What a sweep measures

Direct child folders and standalone files are work items. Nested files belong to that direct child folder, including its subfolders. Every regular file type contributes its relative path, extension, size, and modification time. Symlinks and special files are skipped.

### Content detectors

| Evidence                 | Supported formats                                                                                                                 | Rule                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task markers             | `.md .mdx .txt .csv .ts .tsx .js .jsx .mjs .cjs .py .go .rs .java .kt .swift .rb .php .cs .cpp .c .h .hpp .yaml .yml .json .toml` | Case-insensitive whole words: TODO, FIXME, HACK, TBD, TK, XXX, WIP. All literal matches count, including documentation examples.                                        |
| Unchecked tasks          | `.md .mdx`                                                                                                                        | Lines beginning with `- [ ]`, `* [ ]`, or `+ [ ]`; checked items are excluded.                                                                                          |
| Filename clues           | Every file format                                                                                                                 | Delimited draft, wip, unfinished, todo, temp, temporary, scratch, outline, rough, working-copy, final-v2 and higher, or final-final. Notes and copy alone do not count. |
| Spreadsheet placeholders | `.csv .xlsx`                                                                                                                      | Exact trimmed, case-insensitive TBD, TODO, Pending, ???, Unknown, or Fill in.                                                                                           |
| Spreadsheet gaps         | `.csv .xlsx`                                                                                                                      | Internal gaps in columns filled in at least 80% of comparable rows within dense table regions.                                                                          |
| Missing formulas         | `.xlsx`                                                                                                                           | No formula between formula-bearing neighbors in a column with at least 80% formulas. Formulas are never evaluated.                                                      |

Spreadsheet regions need a complete header, at least five data rows, and at least 60% populated cells (minimum two) per comparable row. Sparse layouts, edge blanks, and merged cells do not trigger structural gap signals. Gaps are counted by affected row, not every missing cell. Formula rules detect absent formulas, not semantic correctness or arbitrary differences between formulas.

Content reads are capped at **2 MiB per file**. Binary text is skipped. Workbooks are bounded to 32 MiB of declared expanded ZIP content, 2,000 archive entries, and 20,000 rows / 100 columns per sheet; unsupported, encrypted, oversized, or malformed content is skipped with a warning when parsing fails. Metadata remains tracked. Total matches are retained, with at most 50 detailed excerpts per work item. CSV placeholders may also match a literal text marker, and each detector’s contribution is shown.

PDFs, Word, PowerPoint, images, archives, design files, and other complex formats are **metadata-only**. Unclosed does not judge their meaning or completeness.

Generated and metadata directories are ignored: `node_modules`, `.git`, `.next`, `dist`, `build`, `target`, `coverage`, `vendor`, `.cache`, `venv`, `.venv`, `__pycache__`, `out`, `tmp`, `temp`, `.idea`, `.vscode`. `.DS_Store` and `Thumbs.db` are skipped too.

### Activity and fading

The first scan establishes a baseline. “Last file modification” comes from filesystem metadata; it is not an observed editing session. Later scans compare **mtime + size** to detect additions, modifications, and removals. Files with unchanged metadata reuse stored content evidence. Up to eight file reads run concurrently, and scanning/parsing happens in a worker so the API remains responsive.

An active scan period is a scan interval containing an observed file change. Multiple changes to one file across scans count as separate change events, not unique files. The chart displays actual scan observations (up to the latest 30), not invented daily activity.

- **Active:** modification metadata or an observed change within seven days.
- **Fading:** changes observed in at least two scan intervals, followed by at least seven quiet days, with explicit loose-end evidence remaining.
- **Stale:** the same requirements with at least 30 quiet days. Presented under Fading in the UI.
- Otherwise, activity is quiet. Old clean files are never promoted just for being old.

Momentum and scores update during sweeps. To observe change, scan periodically while using your files, then scan again later. Repeating scans without file changes builds observation history but does not create active periods.

### Unclosed Score

The 0–100 score sorts evidence; it is not a productivity grade or a completion probability.

| Signal                                | Contribution                             |
| ------------------------------------- | ---------------------------------------- |
| Task markers                          | +2 each, maximum 20                      |
| Unchecked checklist entries           | +3 each, maximum 20                      |
| Spreadsheet gaps and placeholders     | +2 each, shared maximum 20               |
| Missing formulas                      | +4 each, maximum 12                      |
| Draft-like filenames                  | +5 each, maximum 10                      |
| Observed active intervals             | 2+ → +4; 4+ → +8; 7+ → +12               |
| Momentum drop with remaining evidence | 7+ quiet days → +7; 14+ → +11; 30+ → +15 |
| Changed after being marked closed     | +20 until acknowledged by a user action  |

No standalone age points exist. Fading takes precedence when its requirements are met. Changed-after-close or a score of 30+ goes into Needs Attention; lower-scoring evidence with recent activity goes into Still Active. Quiet items with explicit evidence remain available in Needs Attention, sorted by their modest evidence score. Activity alone never puts clean work on Radar.

## Local storage and safety

SQLite lives at `/data/unclosed.db` in the named `unclosed_unclosed-data` Docker volume. File metadata snapshots, observed periods, bounded evidence excerpts, and decision history survive container rebuilds and restarts. All application writes are under `/data`; nothing is written into watched folders.

The container root filesystem is read-only, runs as the unprivileged `node` user, drops Linux capabilities, and disables privilege escalation. Every scan folder is a read-only bind mount under `/scan`. At startup the backend checks Linux mount information and refuses writable roots. The API accepts known item IDs, never arbitrary file-read paths. Symlinks are rejected during discovery, traversal, and content reads. The HTTP port is bound only to host loopback; cross-origin requests and unexpected Host headers are rejected. Browser assets and fonts are local, with a restrictive content security policy.

This is a personal-machine utility, not a shared public server. Other programs or users with access to your local Docker environment or data volume may be able to read the database, including excerpts. Do not publish the port through a reverse proxy. No content is sent to external services by the application. The Docker build uses package registries; runtime does not.

### Verify read-only mounts

```bash
docker inspect unclosed-unclosed-1 --format '{{json .Mounts}}'
```

Every `/scan/...` entry must have `"RW":false`. `/data` is writable. Settings reports only roots the backend verified as read-only.

### Reset history

Stop Unclosed first. The following command **permanently deletes Unclosed’s snapshots, evidence, and decisions**, but never the scanned files:

```bash
docker compose down --volumes
```

If you used the wrapper’s generated configuration:

```bash
docker compose -p unclosed -f .unclosed/compose.json down --volumes
```

To back up data, stop the container and back up the named Docker volume before resetting it. Do not copy only the main SQLite file while it is running; WAL sidecars may contain recent transactions.

## Development and verification

Production is one service: Fastify serves the React/Vite build and local REST API; a Node worker performs sweeps; `better-sqlite3` stores history. Zod validates user actions. Spreadsheet parsing uses ExcelJS and csv-parse.

```text
apps/web/src/          React views, components, hooks, styles
apps/server/src/api/   Local REST API and built-asset allowlist
apps/server/src/db/    Versioned schema and persistence
apps/server/src/safety Path containment and symlink rejection
apps/server/src/scanner/
                      Discovery, traversal, detector interface, scoring, worker
shared/               Domain types
tests/                Detector, scanner, persistence, disposition, API safety tests
example-workspace/    Non-developer examples
scripts/              Docker-hosted mount configuration generator
```

The multi-stage Docker build runs type checking, the complete Vitest suite, and production builds before producing the runtime image. The test runner and compiler are excluded from the final image.

```bash
docker build --target build -t unclosed:checks .
docker run --rm --network none unclosed:checks npm test
docker run --rm --network none unclosed:checks npm run typecheck
docker run --rm --network none unclosed:checks npm run build
```

For frontend development only, contributors with Node 22.12+ can run `npm ci` and `npm run dev` while the Docker backend runs on port 3000. Vite serves port 5173 and proxies the API. Rebuild Docker after backend edits. Host Node is optional for contributors and never required for normal use.

### Known limits

- Mtime + size can miss changes that preserve both; no hashes, file watchers, or semantic interpretation are used.
- Grouping is intentionally simple: one top-level child folder per item. Renaming an item creates a new identity; previous history is retained as unavailable. Removing a whole work item preserves its last snapshot rather than synthesizing a new scan of its missing files.
- There is no historical activity before installation. Old but clean files remain unflagged. Content markers can be intentional examples; you make the final decision.
- Metadata history currently has no automatic retention limit; large roots scanned frequently grow the local database. Traversal is iterative and reads are bounded, but each work item’s metadata is held in memory during processing.
- Scans are committed one complete work item at a time. Cancellation or interruption preserves completed snapshots. Unreadable directories create warnings and retain previous file observations where possible.
- Hidden directories other than the documented ignore list can be scanned. Mount only folders you want included. All symlinks are skipped, even safe ones.
- The Linux Docker runtime is the supported scanner environment. macOS and Windows use Docker Desktop’s Linux engine. POSIX systems need Bash for the wrapper; PowerShell has a companion wrapper.

**Unclosed surfaces evidence. You decide what’s closed.**
