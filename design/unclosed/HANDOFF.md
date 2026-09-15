# Unclosed visual system

Design handoff · 16 September 2026 · React + TypeScript + Tailwind

This package contains responsive, high-fidelity browser mockups and reusable CSS tokens. It changes presentation only. The running application, API, database, detectors, score calculation, and dispositions have not been modified. The preview uses illustrative fixtures and never scans files or calls the application API.

## Open the designs

From the repository root:

```sh
node design/unclosed/preview.mjs
```

Open http://127.0.0.1:4174. Choose a screen and width from the gallery toolbar. Open screen removes the review toolbar. Each screen is directly addressable at `mockup.html?scene=NAME`. The gallery toolbar is handoff tooling, not application UI. The HTML also works directly from disk.

Files:

- `tokens.css`: canonical semantic color, spacing, radius, font, and motion variables.
- `mockups.css`: component geometry, interaction states, and responsive rules.
- `mockups.js`: screen fixtures and in-memory interaction demonstrations.
- `mockup.html`: individual responsive screen.
- `index.html`: screen and viewport gallery.
- `preview.mjs`: dependency-free loopback-only preview server.

## Reference and interpretation

Primary reference: [Canva DAHVTqtsiWk](https://www.canva.com/design/DAHVTqtsiWk/Zh-0WLKof7PzDAeTGHCQHA/view), viewed after sign-in. It contains a Color Accessibility Simulator. Its application canvas has a pale neutral ground, white rounded sections, dark slate controls, generous section gaps, compact supporting text, and geometric heading typography. The Canva editor's cyan/purple toolbar is editor chrome, not part of the reference UI.

Observed embedded document styles specify Proxima Nova for body text, Neue Machina for section headings, `#555567` primary controls, 8 px button radii, 16 px panel radii, 24 px panel padding, and 32 px section spacing. The embedded document opened outside Canva loses text/configuration overrides; its default panel color is `#E4E5EE`, whereas the rendered Canva reference shows white panels. These mockups follow the rendered reference for canvas/surfaces and use that lavender-gray default as the selected-control tint. Canvas `#F0F0F0` and white surfaces are implementation choices matched visually, not an asserted exact extraction of the configured Canva palette.

The sample blue/red/yellow swatches are the checker’s content, not its interface palette. Unclosed's semantic accents are muted derivatives that sit comfortably beside the neutral slate controls. Large saturated status surfaces are avoided.

Fonts are declared by the reference names with local Segoe UI/Arial fallbacks. No Canva font files were copied or bundled. The preview therefore uses locally available fonts. For the intended typography, supply appropriately licensed local WOFF2 files for Proxima Nova and Neue Machina and use `font-display: swap`; retain the fallback stack. The fallback preview is usable but not a claim of exact font reproduction.

## Layout decisions

A compact horizontal navigation holds the same four destinations: Radar, Closed, Off the Radar, Settings. The existing sidebar becomes a header; there are no new destinations or nested navigation. This translates the reference's open, centered composition without turning the app into an administration dashboard.

Page structure: navigation → page heading and primary action → compact text summary → inline scan feedback → existing status/search/filter controls → grouped work items → Recently Closed → quiet trust footer. The work remains visually dominant. Counts are text, not oversized metric cards.

Detail structure: back link → title/status/path → existing actions → activity → evidence sections, with score and decision history in a smaller supporting column. Evidence takes two thirds of desktop width. Narrow windows move the supporting column after evidence. Tracked files and detailed scan history retain their disclosure controls.

## Screen inventory

| Gallery state | Design content | Implementation behavior |
| --- | --- | --- |
| `radar` | 8 surfaced items grouped into Needs Attention, Fading, Still Active; Recently Closed | Existing query, status, location, kind, sort, cards/list controls |
| `scanning` | Inline 68% strip, current path, 28/41 checked, small open arc, Cancel | Existing scan counts; all browsing remains usable |
| `complete` | Sweep complete; 41 checked, 3 new, 2 changed | Calm success strip, dismissible; brief automatic dismissal after a user-triggered demo scan |
| `detail` | Japan Trip, activity, checklist/spreadsheet/history/filename evidence, score, tracked files | Preserve existing evidence excerpts, file paths, line/cell references, and disclosures |
| `closed` | Quiet rows, dates, View; one changed-after-close notice | Closed decision remains explicit |
| `changed` | Closed item with an informational changed notice and Reopen item | Never style this as an error or reopen automatically |
| `off` | Quiet rows and Bring back | Existing restore action, no new workflow |
| `settings` | Locations, mount instructions, privacy, storage, off-radar access, detector explanation | Preserve all existing settings content; no invented folder picker |
| `clear` | Radar clear and next scan action, Recently Closed | Distinct from first run and search with no matches |
| `first` | No folders mounted; existing startup commands | Scan disabled until roots exist |
| `snooze` | Anchored date dialog; Tomorrow, 1 week, 1 month, custom date | Existing presets and custom-date behavior |
| `loading` | Stable card silhouettes and one loading announcement | No false item counts; no continuous shimmer |
| `warning` | Read-access warning with affected mount and expandable filesystem detail | Keep prior evidence/history and readable-folder results |
| `components` | Palette/type, button states, status indicators, tooltip/toast, activity/cards | Developer state reference |

Every state uses the same responsive stylesheet. Direct state links hold the scene for review. The Scan Now demo advances through scanning and complete; it is not connected to the backend.

## Tokens

`tokens.css` is the source of truth. Do not introduce another palette in individual components.

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F0F0F0` | Page ground |
| Surface | `#FFFFFF` | Cards, panels, popovers, header |
| Muted surface | `#F6F6F8` | Excerpts, command help, light hover |
| Selected surface | `#E4E5EE` | Selected navigation/filter/control |
| Primary ink | `#161619` | Titles, evidence statements |
| Secondary ink | `#626270` | Supporting copy |
| Muted ink | `#6B6B76` | Metadata, chart labels |
| Accent | `#555567` | Primary action, links, focus |
| Accent hover / pressed | `#444455` / `#333342` | Button states |
| Decorative border | `#DCDCE3` | Separators; not the only control boundary |
| Control border | `#858593` | Inputs, selects, secondary buttons |
| Needs Attention | `#935138` / tint `#F8EEE9` | Dot + label, warning detail |
| Fading | `#705C8C` / tint `#F1EDF6` | Dot + label, activity |
| Still Active | `#315F70` / tint `#EAF1F4` | Dot + label; changed informational notice |
| Closed | `#426553` / tint `#EDF3EF` | Label and restrained success |

Semantic text must use the dark token on white or its corresponding light tint. Never use a low-opacity chart color for text. Score uses neutral accent; it is not a danger meter.

Typography values are CSS pixels, not points:

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Product wordmark | Heading stack | 23 / 28; mobile 22 / 26 | 600 | −0.6 px |
| Page title | Heading stack | 38 / 43; mobile 30 / 34 | 600 | −1.1 / −0.7 px |
| Section title | Heading stack | 22 / 29; mobile 21 / 27 | 600 | −0.4 px |
| Card title | Heading stack | 19 / 25 | 600 | −0.2 px |
| Body | Body stack | 16 / 24 | 400 | Normal |
| Secondary body | Body stack | 14 / 21 | 400 | Normal |
| Key card reason | Body stack | 15 / 23 | 400 | Normal |
| Metadata / status | Body stack | 13 / 20 | 400 / 600 | Normal |
| Button | Body stack | 14 / 21 | 600 | Normal |
| Paths and commands | Monospace stack | 13 / 21 | 400 | Normal |
| Activity endpoints | Body stack | 11 / 17 | 400 | Normal |

Keep text browser-zoomable. The small graph endpoint labels are supplementary; the status and reason communicate activity at readable text sizes. Do not truncate titles or evidence permanently. Paths and excerpts wrap with `overflow-wrap:anywhere`.

Spacing scale: **4, 8, 12, 16, 24, 32, 48 px**. Use 4 for tightly related micro-elements; 8 for icon/label pairs; 12 for row internals; 16 for content groups and mobile card gaps; 24 for desktop card padding; 32 for sections; 48 for desktop page top spacing. Mobile panel padding is 20 px, an intentional compact-layout exception. Desktop content has a 1344 px outer maximum with 48 px inner gutters.

Radii: 16 px cards/panels/overlays, 8 px controls/excerpts container, 4 px small code surfaces/tooltips; tiny status dots remain circular. No pervasive pill styling. Resting panels are shadowless. Hover shadow `0 8px 24px #2929340A`; overlay shadow `0 12px 40px #2929341F`.

## Responsive specification

| Width | Outer gutters | Card columns | Navigation / controls | Detail |
| --- | --- | --- | --- | --- |
| 1440 | 48 px within centered maximum | 3 | Brand and four links in one header row; search/filter row | Evidence 2fr; supporting column 1fr |
| 1200–1280 | 48 px | 3 | Full controls; compact width still readable | Two columns |
| 1024–1199 | 32 px | 2 | Search full row; three selects + view control wrap underneath | Two columns |
| 768 | 24 px | 2 | Brand above four evenly distributed links; controls wrap | Evidence first; two supporting panels below |
| 600–767 | 24 px | 2 | Same as tablet | Stacked main columns |
| 375–430 | 20 px | 1 | Brand then four links; heading and full-width Scan Now; filters in 2-column grid | Fully stacked; actions wrap; files/history become vertical records |

The 1152 px gallery is the representative compact laptop. Mobile never scales a desktop canvas. Summary wraps without divider artifacts. Navigation stays directly visible. Six status options wrap into three rows rather than horizontal scrolling. Search remains full-width; controls remain 44 px tall. At mobile widths, list mode uses stacked records; its information and actions stay available.

## Component contracts and states

Shared interactive rules: minimum 44 px control height; visible `3px solid #555567` focus ring with 3 px offset; 180 ms transitions; disabled controls expose native `disabled`; no hover-only actions. Links keep text labels and keyboard focus. Apply border/fill changes on hover, then a 1 px press translation on active; remove transforms under reduced motion.

| Component | Default / geometry | Hover and focus | Pressed / selected / disabled |
| --- | --- | --- | --- |
| Navigation | 14 px labels, 44 px minimum hit area, 8 px radius | Muted surface; shared focus | Selected lavender-gray fill, `aria-current=page`; no disabled destinations |
| Primary button | Slate fill, white text, 10×16 padding | Darker fill; focus ring outside | Darkest fill; disabled gray, no movement |
| Secondary button | White, strong 1 px border | Muted fill, slate border, focus ring | Selected tint; native disabled gray |
| Text button | Transparent with slate label | Light tint; full hit area focus | Selected tint; disabled native opacity/color treatment |
| Status indicator | 7 px dot + 13 px textual label | Noninteractive; no hover state | Label accompanies every color; no score-based saturation |
| Work card | White, 16 radius, 24 padding | 2 px lift, soft shadow, subtle border, arrow shifts 3 px | Card body is not a nested button; one explicit detail link |
| Activity | CSS bars, 40 px card / 80 px detail | Slight bar emphasis on card hover | No interaction required; summarized accessibly |
| Evidence row | 20 px file icon, path + supporting copy, optional excerpt | Plain content, selectable text | Line/cell references retained; absent fields omitted |
| File row | Path, size, modified date; 14 px row body | Disclosure summary has focus | Mobile vertical records, no clipped table |
| Score | Neutral 13 px card metadata; 24 px detail number | Explanation tooltip available via focus/hover | No dial, badge escalation, or large KPI |
| Tabs | Plain text + selected rectangular tint | Focus ring; arrow/Home/End navigation | `aria-selected`; selected fill; no disabled fixture |
| Search / filters | White, strong border, 44 height | Slate border and visible ring | Existing options only; selected value never color-only |
| Summary metric | Inline bold value + regular label | Not interactive | Wrap on narrow windows, no placeholder zeros while loading |
| Scan progress | 24 px arc, path, count, percentage, 3 px track | Cancel retains keyboard focus | Scan disabled while running; completion distinct from failure |
| Snooze dialog | 336 px anchored white panel, 24 padding, 16 radius | Presets highlight; custom date visible label | Native date constraints; Save disabled until valid; Escape/outside close, return focus |
| Settings row | Icon + label/path + read-only text | Noninteractive data | Path wraps; read-only text moves below on mobile |
| Empty state | Small open arc/folder, title, brief next step | Real CTA uses standard button | Separate clear, first-run, and no-results messages |
| Toast | Dark surface, white 14 px text, bottom center | No hover dependency | Polite status, ~4.5 seconds; no new Undo functionality |
| Tooltip | Dark surface, 12 px label, 8×12 padding | Shows on hover and focus | Supplementary information only; dismissal must not trap focus |
| Skeleton | Static neutral shapes matching cards | Noninteractive | One polite loading announcement, shapes hidden from AT |
| Warning | Muted warm tint, icon, title, explanation | Expandable diagnostic detail | Never hides usable results; no pulsing/error-red takeover |

Use the existing Lucide React icon set in implementation, stroke 1.7–1.8 px, 18–20 px typical. The mockup uses small inline SVG equivalents. The product mark is a simple open-circle form. Do not import another icon library.

## Activity signature

The bars encode observed scan periods, not inferred daily work and not a continuous financial trend. Higher bars mean more observed changes in that period. Show the latest bounded window, in chronological order. Set height to `max(3px, normalizedChangeCount × chartHeight)`; zero-change periods use the low-opacity baseline mark. Preserve baseline distinction: a first scan is not evidence of activity; show “First scan · history starts here” instead of inventing bars. No interpolation between scans, no arrow suggesting forecast.

Include a readable summary such as “Activity has faded. No activity detected for 23 days.” Provide full timestamps and counts in the existing expandable scan history. Bars are decorative once that equivalent text is available. Do not make every bar an extra tab stop. If per-period tooltips are later wired to the existing data, preserve keyboard access through the history disclosure.

## Behavior and data mapping

- Keep `useUnclosed`, the API client, backend routes and `shared/types.ts` unchanged during presentation implementation.
- Map `WorkItem.category` and disposition to labels; do not infer statuses from color or score. Keep Quiet and Snoozed behavior in the existing filters.
- Use `WorkItem.score` and `signals[].weight` directly. The example brief's listed weights add to **63**, not 84; the coherent fixture therefore displays 63. These are illustrative visual fixtures, not a proposal to change scoring. Age alone must never surface an item.
- Progress is `itemsScanned / itemsDiscovered × 100` when the denominator is positive. Discovery can increase it; label it as progress through currently discovered items. Before a denominator exists, use an indeterminate track and “Discovering work items…” rather than fake precision. Show real `currentItem`. Do not invent backend stage signals for decorative rotating messages.
- Preserve Cancel, cancelled, failed, error, and warning behavior from `ScanStatus`. Failed scan uses a factual inline “Sweep interrupted” notice and backend error text. Do not show success for partial/failed work. Keep diagnostic disclosures after a brief completion banner dismisses.
- A user-triggered successful sweep may dismiss its success strip after five seconds; leave summary/last-scan information available. Direct mockup scene links hold their states for review. `prefers-reduced-motion` disables spin but retains text/progress updates.
- Keep `reopened`/changed-after-close handling in the existing domain logic. The visual notice does not clear CLOSED or auto-restore anything.
- Snooze remains Tomorrow / 1 week / 1 month / custom date. Use the existing date calculations, not the preview's frozen September 2026 dates. Preserve the existing busy state and error handling; on failure leave the dialog and date intact.
- The preview's disposition buttons demonstrate feedback and destination styling only. They do not model persistence. Navigation to item details uses representative fixtures. Production must use the selected work item's ID throughout.
- Preserve existing search/filters in Closed and Off the Radar where the live application provides them, using the same control component. The mockups show the primary quiet list treatment; do not delete functionality to match a fixture's omission.
- Preserve detail errors, no-signal states, unavailable item warning, history, tracked files, and all existing Settings explanations. Their visual variants use the same empty/warning/row primitives.

## React and Tailwind implementation map

| Existing file/component | Presentation work |
| --- | --- |
| `components/Sidebar.tsx` | Render existing destinations as responsive header; preserve page callbacks |
| `DashboardHeading.tsx` | Page title, small summary, primary scan action |
| `ScanStatus.tsx` | Inline strip, real progress count, cancel, outcome and warnings |
| `WorkFilters.tsx` | Wrapped status controls, search/selects, list/card toggle; preserve props |
| `WorkCard.tsx` | Title → status → primary reason → activity → evidence → score/link |
| `Activity.tsx` | Bar/dot signature and readable observed-history summary |
| `pages/Detail.tsx` | Evidence-dominant responsive columns, compact score, same actions/disclosures |
| `SnoozeDialog.tsx` | Anchored desktop dialog / bounded mobile panel; preserve modal keyboard semantics if retaining `<dialog>` |
| `pages/Settings.tsx` | Reusable location/privacy/storage rows and command surface |
| `styles/index.css` | Consolidate tokens and component styles; avoid stacking a second conflicting theme |

Tailwind v4 can expose the same variables through `@theme inline`:

```css
@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-secondary: var(--text-secondary);
  --color-accent: var(--accent);
  --color-line: var(--line);
  --font-sans: var(--font-body);
  --font-display: var(--font-heading);
  --radius-panel: var(--radius-card);
  --radius-control-ui: var(--radius-control);
}
```

Example card utilities: `rounded-panel bg-surface p-6 transition duration-180 hover:-translate-y-0.5 focus-within:outline-accent`. Match the exact breakpoint rules in `mockups.css`; the default Tailwind `md` breakpoint alone is insufficient for the 599/899/1199 adjustments. Keep components stateless where existing props already carry data; this is not a state-management rewrite.

## Accessibility and motion acceptance

- Check normal text at 4.5:1, large text at 3:1, meaningful control boundaries and focus at 3:1. Core token pairs are checked in `VERIFICATION.md`.
- Labels and explanations accompany all state colors. Chart tint is supplementary, not the only way to identify an activity state.
- Links, buttons, select controls, date input, and disclosure summaries support keyboard use. No clickable `<div>` controls.
- Use proper tab/panel association or plain filter buttons if no tabpanel semantics are needed. The gallery has simple demo tab behavior; implementation should preserve/review full accessible semantics.
- For the production snooze dialog, keep focus inside a modal variant, close on Escape, and restore focus to Snooze. If using the nonmodal anchored variation, do not set `aria-modal=true` or trap focus; close when focus leaves the component. The preview demonstrates the nonmodal variation.
- Announce scan phase/outcome, not every path and percent update. Expose a labeled progressbar for current value. Keep a live region outside a replaced subtree in the production implementation.
- Use 180 ms fill/border/arrow/card transitions, 180 ms overlay entrance, and a slow arc only while scanning. No permanent movement, confetti, bounce, or shimmer. Disable all transforms/animations for reduced motion.
- Verify at 200% zoom, long names/paths, empty collections, large text, failed requests, and real keyboard focus before merging the future frontend implementation. This handoff does not claim that the unchanged production app has passed those checks.

## Scope boundary

No new product features, routes, database migrations, API fields, folder-upload flows, accounts, analytics, AI, calendar, kanban, streaks, or collaboration. The design gallery is an artifact for review. Its JavaScript must not replace production application logic. Do not push or deploy these design artifacts automatically as the live application.
