import fs from 'node:fs/promises';
import path from 'node:path';
import { seoPages, SEO_ORIGIN } from './src/lib/seoPages.js';

const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

// Real HTML documents, identical for people and crawlers, with the React tools intact.
export function seoDocuments() {
  let output;
  return {
    name: 'frontwing-public-documents',
    apply: 'build',
    configResolved(config) { output = path.resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const home = await fs.readFile(path.join(output, 'index.html'), 'utf8');
      for (const [route, page] of Object.entries(seoPages)) {
        if (route === '/') continue;
        const url = SEO_ORIGIN + route;
        const document = home
          .replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`)
          .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*/g, `$1${escape(page.description)}`)
          .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*/g, `$1${escape(page.title)}`)
          .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
          .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
          .replace(/<h1>.*?<\/h1>/, `<h1>${escape(page.heading)}</h1>`);
        const directory = path.join(output, route.slice(1));
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(path.join(directory, 'index.html'), document);
      }
    },
  };
}
