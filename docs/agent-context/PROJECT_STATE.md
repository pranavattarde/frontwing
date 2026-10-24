# PROJECT STATE -- FrontWing

Last updated: 2026-10-24, compact homepage revision and requested production release.

## Latest revision

- Replaced the car-led homepage with a product introduction and the current race overview at the top. The investigation room stays prominent; tools, recent history, saved history and real news share one accessible tabbed panel.
- Desktop page height is 1,160 px at 1280 x 720; phone height is 1,648 px at 390 x 844. Both fit within two screens without horizontal overflow.
- Added CSS perspective reliefs and short tab transitions, honoring motion pause and reduced motion. Homepage footer is compact. No runtime dependencies were added.
- Production build passed (1,045 modules). Targeted ESLint checks passed. Verified live calendar/feed data, keyboard tabs, guest archive states, deliberate question prefill and strategy navigation.
- Both `frontwing.pancred.space` and `frontwing.pranavattarde.in` currently point to the Vercel `frontwing` project. Its Git integration deploys main. The GitHub CD workflow is only an image publisher with a placeholder deployment step.
- User explicitly authorized pushing, merging the design branch and deploying both domains. Source branch `codex/frontwing-race-ui` was merged into main at `8422103`. Both frontend aliases serve the new bundle.
- Live verification found the gateway returned 403 for `https://frontwing.pranavattarde.in` because it was missing from the CORS allowlist. Added that exact HTTPS origin in `b9bc483`; the production gateway now returns 200 for its race feed and 204 for authenticated-request preflights on both frontend origins. An untrusted lookalike origin still returns 403.
- Release complete: both custom domains serve the compact redesign and real race/news data. Verified production desktop and phone layouts (same 1,160 / 1,648 px heights), zero landing-page car images, tabs and source links. Vercel marked the merged release successful. Full CI passed for both the merge and gateway fix; latest verified run: `40086720215`.
- The screenshots and full revision details are in `docs/UI_REDESIGN.md` and `docs/ui-redesign/compact-home-*.jpg`.

The earlier full-application verification record below remains relevant to the analytical pages; its car-led homepage is superseded.

## Current verified state

The frontend has a complete racing editorial redesign. React and Tailwind remain the implementation foundation. No new runtime dependency was added; Lucide was removed. The existing Framer Motion and lazy-loaded Three.js / React Three Fiber features remain.

The new shell includes responsive navigation, an accessible account/investigation archive, real-history search, a large editorial homepage, scroll-driven car artwork, motion pause, a matching footer and reading-page styles. Strategy and investigation response widgets share the new typography, colors and angular surfaces. The original investigation, simulation, history, authentication, event-feed and 3D APIs remain connected.

See `docs/UI_REDESIGN.md` for design, preserved features, checks, limitations and screenshot locations.

## Verified this session

- Frontend production build succeeds (1,046 modules).
- Frontend lint exits successfully: zero errors, 147 unused-variable warnings. Many JSX imports are reported because the existing configuration does not enable React JSX usage rules.
- Browser verification used the production bundle at `http://127.0.0.1:4175/`, desktop 1280 x 720 and phone 390 x 844, with actual local backend responses.
- British 2024 investigation returned Hamilton as winner. Real strategy simulation results, lap chart and comparison table rendered and reopened from saved history.
- Ctrl+K history search opened the correct strategy route. Mobile menu, authentication, archive close/navigation and motion pause were exercised.
- British 2024 HAM/VER Ghost Battle generated, stayed visible after its URL changed, and rendered actual sectors, lap times and top speeds. Seeking, reset and speed controls worked.
- Team selection uses static thumbnails and zero WebGL canvases. The generated circuit uses one demand-rendered canvas. Responsive track framing derives from real circuit bounds.
- User-requested cleanup closed all five research/testing tabs created for this redesign, including the final preview. No agent-created testing tab remains open.

## Running local stack

Production frontend: `https://frontwing.pancred.space/` and `https://frontwing.pranavattarde.in/`, both aliases of the Vercel project. Gateway: `https://frontwing-backend.onrender.com`. Vercel and Render publish main through their existing Git integrations. The GitHub CD workflow separately publishes container images; its deployment job is a placeholder and is not the live release mechanism.

The local preview on port 4175 was used for compact-layout checks against the real public gateway. Local Docker/AI services are not running in this revision's verification session. Temporary browser verification tabs were left unmarked for cleanup; the successful test tab was explicitly closed. Logs are ignored under `logs/compact-*`.

## Known limits

- The lazy Three.js vendor bundle is 906.85 kB and Vite warns about its size. It is isolated from the initial homepage bundle.
- The existing backend returned duplicate saved strategy turns during QA. Persistence logic was outside this UI change.
- Backend and Python test suites were not rerun for this frontend-only change. Earlier audit results remain historical in CHANGELOG.md; they are not new verification claims.
- Unrelated untracked interview-preparation documents and scratch scripts were left untouched and excluded from the redesign commit.
- Live external data, account operations and analysis still depend on their backend/upstream services. No fallback race results, telemetry or circuit outlines were fabricated.

## Important maintenance points

- Keep `GhostBattle3D` lazy-loaded from App.jsx.
- Preserve `generatedBattleRef`: updating replay URL parameters must not trigger setup effects that discard the generated data.
- Suggestions only prefill. Agent queries and telemetry extraction require an explicit submit/generate action.
- Keep original API contracts and correct `/strategy?id=...` history routing.
- Preserve authentic circuit geometry and honest missing-data messages.
- Read RULES_AND_GOTCHAS.md and update this file plus CHANGELOG.md for subsequent work.
