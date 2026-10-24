# FrontWing UI redesign

Implemented 24 October 2026 on `codex/frontwing-race-ui`.

## Design

The interface uses an editorial racing identity: oversized condensed headlines, warm ivory and charcoal surfaces, burnt-red blocks, hard edges, numbered sections and timing-aligned tables. The homepage car moves with scroll; restrained entrance sequences and circuit-line motion have a global pause control and reduced-motion support. Buttons do not animate on hover.

The visual references were the owner's [portfolio](https://www.pranavattarde.in/), [Formula 1](https://www.formula1.com/) and [McLaren Racing](https://www.mclaren.com/racing/formula-1/). The local portfolio supplied the original transparent car asset and fonts. No generated imagery was introduced. Font files are Barlow Condensed (display) and DM Sans (body).

The redesign replaces the app shell, homepage, search, question composer, workspace headings, footer, account/archive presentation, Ghost Battle selectors and controls. Existing analytical widgets share the new semantic tokens. About and guide pages use the matching reading stylesheet. Gradients, Lucide, shadows, rounded cards, glass effects, emoji, fake metrics and hover effects were removed or disabled throughout the rendered interface.

## Features retained

- Typed race investigations and deliberate submission, with suggested questions that only prefill.
- Authenticated saved history, pinning, renaming, grouping, moving and deletion controls in the archive.
- Search of real saved history, keyboard navigation, Ctrl+K and correct strategy-history routing.
- Real event schedule, countdown, local/IST timing, authentic track geometry or an honest unavailable state.
- Existing strategy simulation API, response cards, lap progression chart, comparison table and saved-thread restoration.
- Ghost Battle season, event, team and driver selection; explicit generation; authentic track geometry; synchronized playback, seeking, reset, speed and classification.
- Existing route aliases, metadata, source links and reading pages.

## Reliability and resource changes

- Publishing a generated Ghost Battle selection to the URL no longer clears the just-loaded replay.
- The circuit camera fits the real track bounds and viewport aspect ratio.
- Team thumbnails are static SVG previews. The actual circuit keeps one 3D canvas with demand rendering and capped pixel density.
- Global motion pause also stops active replay playback. Account changes refresh available race selections.
- Archive navigation closes the drawer even when opening the current route. Dialogs support Escape, focus handling and keyboard use.
- Editorial HTML fragments are removed before display. News links remain external source links; no generated metric defaults accompany them.
- The countdown advances to an upcoming session when the advertised target has already passed.

## Verification

Production preview: `http://127.0.0.1:4175/`, gateway `5000`, AI service `8000`, local PostgreSQL and Redis. Used a separate local UI QA account and real backend responses. No stub responses or synthetic fixtures were added.

| Check | Result |
| --- | --- |
| Production Vite build | Passed, 1,046 modules |
| Frontend ESLint | Passed with zero errors and 147 unused-variable warnings |
| Desktop layout, 1280 x 720 | Verified fonts, car asset, navigation, source links and no page overflow |
| Phone layout, 390 x 844 | Verified home, navigation, account, strategy/table containment and Ghost Battle; fixed workspace-heading overflow |
| Race investigation | Typed British 2024 winner question; real response named Hamilton ahead of Verstappen; saved thread reopened |
| Strategy simulation | Hamilton five laps earlier at Dutch 2024; real result and synchronized chart/table rendered; history restored |
| Archive search | Hamilton search returned the saved strategy; Enter opened `/strategy?id=...` |
| Sign-in / sign-out | Verified real local account flow and mobile archive controls |
| Ghost Battle | British 2024 HAM/VER generated; replay persisted after URL update; seek, reset and speed controls verified |
| Authentic lap table | VER 1:28.952, HAM 1:29.438, +0.486s; actual sectors and top speeds rendered |
| Resource use | Zero 3D canvases during selection, one during replay; no separate thumbnail canvases |

Screenshots are in `docs/ui-redesign/`: desktop/mobile home, investigation result, strategy results, desktop/mobile real 3D circuit replay and About. The About and telemetry reading pages were also opened and verified. The final browser console check returned no errors. Global pause was verified during replay and across navigation back to the homepage; paused content remains visible. All agent-created research/testing tabs were closed after verification.

## Technology and scope

No frontend runtime dependencies were added. React, Tailwind, Vite, existing Framer Motion and the existing Three.js / React Three Fiber replay remain. Lucide was removed from the dependency list and lockfile. New effects use CSS and browser APIs.

The 906.85 kB Three.js vendor chunk still produces Vite's size warning; it is lazy-loaded only for the Ghost Battle route. ESLint's current configuration reports JSX component imports as unused, alongside other unused variables; warnings are not treated as errors. The existing backend returned duplicate saved strategy turns during QA; this frontend change does not alter persistence. Backend, AI algorithms, schema and deployment configuration were not changed. No deployment or main-branch merge was performed.
