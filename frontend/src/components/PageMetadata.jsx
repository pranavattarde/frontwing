import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { seoPages, SEO_ORIGIN } from '../lib/seoPages';

export function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.replace(/\/$/, '') || '/';
    const page = seoPages[path];
    // Saved investigations and internal/demo screens are not search landing pages.
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.content = page ? 'index,follow,max-image-preview:large' : 'noindex,follow';
    document.title = page?.title || 'FrontWing | Race Intelligence Workspace';
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      if (page) canonical.href = SEO_ORIGIN + path;
      else canonical.removeAttribute('href');
    }
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      const element = document.querySelector(selector);
      if (element) element.content = page?.description || 'FrontWing race intelligence workspace.';
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      const element = document.querySelector(selector);
      if (element) element.content = document.title;
    }
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = SEO_ORIGIN + (page ? path : '/');
  }, [pathname]);
  return null;
}
