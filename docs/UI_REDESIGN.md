# FrontWing UI redesign

## Homepage UX rebuild, 24 October 2026

The compact revision below is superseded. The homepage now follows a task hierarchy: one labelled investigation field and explicit Investigate action; race context beside it; dedicated strategy/replay entry points; and on-demand timetable and news. History remains in the existing archive with its pin/group/rename/delete controls. Returning users can continue their most recent investigation.

The goal is a readable product interface, not a fixed number of screens. Main copy uses 18 px on desktop and 17 px on phones, inputs at least 16 px, metadata at least 12 px and interactive targets at least 44 px. The enabled primary action has a measured 4.90:1 text contrast ratio. Mobile keeps a concise race summary and unfolds the full schedule at readable sizes. Dialogs trap focus, close on Escape, restore focus and support motion preferences. Race and news loading are independent; no timetable or editorial facts were fabricated.

Verified the production bundle at normal zoom on 1280 x 720 and 390 x 844: no horizontal overflow, five actual sessions, five source-linked articles, deliberate suggestion prefill, both tool destinations and modal keyboard behavior. Build passed (1,045 modules) and targeted ESLint returned zero errors. No new runtime dependencies. Review images use the `ux-` prefix in `docs/ui-redesign/`.


## Compact homepage revision, 24 October 2026

The homepage now acts as a product workspace. The team-branded car and full-screen promotional hero are removed. A concise product introduction sits beside the current race weekend, next-session countdown and full IST timetable. The investigation room remains prominent immediately below.

The former long sections 02 through 05 share one keyboard-accessible panel with Race tools, Recent, Saved and Paddock feed tabs. The tools link to the actual strategy and replay workspaces. CSS perspective creates depth in the race-round relief and tool illustrations; panel changes use a short perspective entrance. Motion pause and reduced-motion preferences suppress it. The homepage footer is compact; analytical pages retain their established footer.

Browser verification of the production bundle measured 1,160 px total page height at 1280 x 720 (1.61 screens) and 1,648 px at 390 x 844 (1.95 screens). Current race information and the question area are present in the first desktop screen. Five real news items fit inside the shared feed panel. No horizontal page overflow was observed. Verified arrow-key tab navigation, guest history/saved states, suggestion prefill without submission and direct strategy navigation. Screenshots: `compact-home-desktop.jpg` and `compact-home-mobile.jpg` in `docs/ui-redesign/`.

Production build passed with 1,045 modules; targeted ESLint checks returned no errors. This revision adds no runtime dependency. Verification used the existing public Render gateway, avoiding a second local database/AI stack. Both requested custom domains are aliases of the Vercel `frontwing` project, whose existing Git integration publishes the main branch. The GitHub CD workflow only publishes container images and contains a placeholder deployment step; it is not the Vercel release mechanism.

The original design and verification record follows for context; the compact homepage supersedes its car-led landing page.

Release verification: the redesign branch was merged into main at `8422103`; both Vercel aliases serve `index-QC73L_rx.js`. Browser verification confirmed the new layout and race feed on pancred.space. The second alias exposed a pre-existing gateway configuration gap: the API returned 403 for its Origin. Added the exact `https://frontwing.pranavattarde.in` origin to the gateway allowlist as part of completing the requested two-domain release.

Release completed: the gateway fix `b9bc483` is live. Both allowed origins return 204 for authentication preflights; an untrusted lookalike origin returns 403. Both custom domains render the compact homepage with the real race schedule and five real editorial items. Verified a fresh load on the second domain after the fix, including 390 x 844 phone layout. Live screenshots: `live-pancred-desktop.jpg`, `live-pranav-desktop.jpg`, `live-pranav-mobile.jpg`. Full GitHub CI passed for the merged redesign (`40086514201`) and the gateway fix (`40086720215`); Vercel reported a successful frontend deployment. No new runtime dependencies were introduced.

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
