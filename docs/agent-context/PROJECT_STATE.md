# PROJECT STATE -- FrontWing

Last updated: 2026-10-24, homepage UX rebuild. Source branch: `codex/homepage-ux-rebuild`.

## Current design direction

The user rejected the earlier compact homepage because it reduced type sizes and compressed unrelated content to hit a literal screen count. That layout is superseded. Do not restore it or use viewport height as the main acceptance criterion.

The homepage now has a single investigation workspace with a visible field label and Investigate button. The current race is supporting context beside it on desktop; phones show a concise weekend summary above the question area. Full schedules and news open on demand. Strategy Engineer and Ghost Battle have separate readable entry rows. History, saved items, pinning, groups and deletion remain in the canonical archive; authenticated users can continue their latest investigation from the homepage.

## UX acceptance criteria

- Primary copy is 18 px on desktop and 17 px on phones. Input is 16 px or larger. Labels and controls retain comfortable sizes; metadata is at least 12 px.
- The enabled Investigate button has 4.90:1 text contrast. Interactive targets are at least 44 px.
- Keep one clear primary action, readable hierarchy, purposeful spacing and progressive disclosure. Avoid miniature timetables, duplicate hero/query sections, mixed-content tab walls and decorative fake 3D demos.
- Suggested question intents only prefill; explicit submission remains necessary. The race calendar loads independently of the editorial feed.
- Dialogs have accessible names, focus traps, Escape support, body scroll locking and focus restoration. Existing motion pause and reduced-motion preferences are honored.
- Keep the original exclusions, including no hover animation, gradients, shadows, soft cards, Lucide or team-car advertising on the homepage.

## Verified in this session

- Production Vite build passes: 1,045 modules. The lazy Three.js vendor size warning remains unchanged.
- Targeted ESLint checks pass with zero errors.
- Browser QA at 1280 x 720 and 390 x 844, normal zoom: no horizontal overflow; desktop body text 18 px, phone input 16 px and submit button 52 px tall.
- Real weekend schedule renders all five sessions in readable IST and circuit-local rows. Phone schedule uses a single-column reading layout.
- Real editorial feed contains five articles with source links. News uses a readable drawer, rather than loading all stories into the landing page.
- Verified suggestion prefill without submission, keyboard modal loop, Escape/focus restoration, mobile motion pause and both tool destinations.
- QuestionBar now accepts optional inputId and submitLabel props. Existing analytical pages retain their default input and submit behavior.
- No new runtime dependency, backend or schema change. Hero timeout allows 30 seconds for gateway cold starts.

Screenshots: `docs/ui-redesign/ux-rebuild-desktop.jpg`, `ux-rebuild-mobile.jpg`, `ux-rebuild-full-page.jpg`, `ux-weekend-schedule.jpg`, `ux-news-drawer.jpg`.

## Release and infrastructure

Prior release main commit: `ad6e361`. The existing Vercel project serves both `https://frontwing.pancred.space/` and `https://frontwing.pranavattarde.in/`; its Git integration deploys main. Gateway: `https://frontwing-backend.onrender.com`. Keep the exact custom-domain CORS entry added in `b9bc483`.

The user authorized push, merge and deployment to both domains earlier in this same task. The UX rebuild is ready for merge and production verification. Record final deployment evidence here after release.

Local preview uses port 4175 and the public gateway. No local Docker/AI stack was started for this revision. Browser testing reuses one temporary tab.

## Maintenance and evidence limits

- Preserve lazy loading of GhostBattle3D and its generated URL-state guard.
- Preserve real API contracts, explicit query/generate actions and correct `/strategy?id=...` history routing.
- Keep authentic circuit geometry and honest unavailable states; do not fabricate telemetry or news.
- Full service-suite results from previous sessions are historical unless reverified for this release.
- Unrelated untracked interview documents and scratch scripts are untouched.
- Update this state file and prepend CHANGELOG.md for subsequent work; RULES_AND_GOTCHAS.md is append-only.
