# Design preview verification

Checked 16 September 2026 in the Codex browser. These results apply to the separate mockup gallery, not the unchanged production app.

- All 14 scenes rendered at 1440, 1152, 768, 375, 390, and 430 px: **84 scene/width combinations**.
- No document-level horizontal overflow in those combinations.
- No visible button, input, or select measured below 40 px tall; the shared rule specifies 44 px minimum.
- Visually inspected desktop Radar/detail, tablet scanning, and mobile Radar/snooze. Adjusted tablet filter alignment after visual review.
- Search for Japan narrowed cards to Japan Trip; list view switched layout; detail navigation and Tomorrow snooze produced the expected preview toast and dismissed the dialog.
- `node --check design/unclosed/mockups.js` passed.
- Browser error log was empty after the scene and interaction checks.
- Only `design/unclosed/` files were added; no application/backend files changed.

Contrast calculations use WCAG relative sRGB luminance:

| Pair | Contrast |
| --- | --- |
| Primary ink / canvas | 15.85:1 |
| Secondary text / white | 6.00:1 |
| White / primary button | 7.29:1 |
| Attention text / white | 6.04:1 |
| Fading text / white | 5.84:1 |
| Active text / white | 7.00:1 |
| Closed text / white | 6.53:1 |
| Control border / white | 3.64:1 |
| Focus outline / canvas | 6.40:1 |

Muted text was changed from `#6D6D79` (4.48:1 on the canvas) to `#6B6B76` to clear 4.5:1. Low-opacity chart bars and faint panel separators are decorative; their textual equivalents and control boundaries use stronger colors. Disabled controls are intentionally lower contrast.

Remaining implementation checks: licensed font substitution, real backend data, assistive-technology navigation, 200% zoom, real request failures/busy states, long filenames, production modal focus containment, and regression checks against existing React behavior. A mockup is not a full accessibility certification or production test suite.
