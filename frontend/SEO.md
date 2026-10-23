# FrontWing search configuration

Canonical origin: https://frontwing.pranavattarde.in

- index.html delivers metadata, WebApplication/WebSite JSON-LD, a real FrontWing icon and an initial readable introduction.
- src/lib/seoPages.js is the shared metadata registry for the briefing room, Strategy Engineer and Ghost Battle.
- seo-build.js emits route-specific HTML for public tools after Vite builds; PageMetadata.jsx keeps metadata consistent during client-side navigation.
- public/about/ and public/guides/ contain directly accessible explanatory documents. The briefing room links to them visibly.
- public/sitemap.xml lists only public landing pages; public/robots.txt advertises it.
- vercel.json serves public tool documents, preserves dynamic app routes, marks saved investigation/demo routes noindex and lets unknown URLs return an actual 404 instead of a blank app shell. noindex is not an access control; backend authentication is still required.
- All aliases identify the custom subdomain as canonical. Existing aliases remain accessible.

Build with npm run build. For a new public tool route, update seoPages, sitemap and hosting rewrites together. For a new static guide, update the sitemap and add useful visible links. Keep analysis limitations clear and avoid fabricated results, reviews or claims about guaranteed rankings.

The Google Search Console domain property pranavattarde.in covers this subdomain too. Preserve the Google verification TXT record in GoDaddy DNS.
