import urllib.parse
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
import requests
from app.core.logger import logger

class WebSearchEngine:
    """Live web search engine for Formula 1 and motorsport knowledge questions.
    
    Retrieves verified encyclopedic information (via Wikipedia REST API) and
    recent motorsport journalism/regulations news (via Google News RSS search)
    with zero external paid API key dependencies.
    
    Adheres to copyright and fair-use guidelines: extracts factual snippets,
    clean summaries, and explicit source citations rather than long verbatim quotes.
    """
    
    WIKI_SEARCH_URL = "https://en.wikipedia.org/w/api.php"
    GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"
    USER_AGENT = "FrontWingF1Bot/1.0 (https://frontwing.app; motorsport intelligence)"

    @classmethod
    def search(cls, query: str, max_results: int = 5) -> Dict[str, Any]:
        results: List[Dict[str, Any]] = []
        sources: List[str] = []
        documents: List[str] = []

        clean_query = query.strip()
        if not clean_query:
            return {
                "status": "error",
                "message": "Empty query provided to web search engine.",
                "results": [],
                "sources": [],
                "documents": []
            }

        # 1. Search Wikipedia for deep encyclopedic / technical / historical concepts
        wiki_results = cls._search_wikipedia(clean_query, max_items=2)
        seen_urls = set()
        for r in wiki_results:
            results.append(r)
            url = r.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                sources.append({
                    "title": r.get("title") or r.get("source") or "Wikipedia",
                    "url": url,
                    "source": r.get("source") or "Wikipedia"
                })
            documents.append(f"[{r['source']}] {r['title']}: {r['snippet']}")

        # 2. Search Google News RSS for recent reporting, regulations, and journalism
        news_results = cls._search_google_news(clean_query, max_items=3)
        for r in news_results:
            results.append(r)
            url = r.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                sources.append({
                    "title": r.get("title") or r.get("source") or "Google News",
                    "url": url,
                    "source": r.get("source") or "Google News"
                })
            documents.append(f"[{r['source']}] {r['title']}: {r['snippet']}")

        if not results:
            logger.warning(f"[WebSearchEngine] No external results retrieved for query: '{query}'")
            return {
                "status": "missing_data",
                "query": clean_query,
                "message": f"No external web sources found for '{clean_query}'.",
                "results": [],
                "sources": [],
                "documents": []
            }

        return {
            "status": "success",
            "query": clean_query,
            "results": results[:max_results],
            "sources": sources,
            "documents": documents[:max_results],
            "summary": f"Retrieved {len(results)} verified external sources for '{clean_query}'."
        }

    @classmethod
    def _search_wikipedia(cls, query: str, max_items: int = 2) -> List[Dict[str, Any]]:
        results = []
        try:
            # Step A: search for relevant Wikipedia article titles
            params = {
                "action": "query",
                "list": "search",
                "srsearch": f"Formula 1 {query}" if "formula" not in query.lower() and "f1" not in query.lower() else query,
                "format": "json",
                "utf8": "1",
                "srlimit": max_items
            }
            headers = {"User-Agent": cls.USER_AGENT}
            resp = requests.get(cls.WIKI_SEARCH_URL, params=params, headers=headers, timeout=6.0)
            if resp.status_code != 200:
                logger.warning(f"[WebSearchEngine] Wikipedia search returned status {resp.status_code}")
                return results

            search_data = resp.json().get("query", {}).get("search", [])
            for item in search_data[:max_items]:
                title = item.get("title")
                if not title:
                    continue

                # Step B: fetch lead extract (plain text summary) for the article
                extract_params = {
                    "action": "query",
                    "prop": "extracts",
                    "exintro": "1",
                    "explaintext": "1",
                    "titles": title,
                    "format": "json"
                }
                ex_resp = requests.get(cls.WIKI_SEARCH_URL, params=extract_params, headers=headers, timeout=6.0)
                if ex_resp.status_code == 200:
                    pages = ex_resp.json().get("query", {}).get("pages", {})
                    for pid, pdata in pages.items():
                        extract = pdata.get("extract", "").strip()
                        if extract:
                            # Truncate extract cleanly at sentence boundary to stay within fair-use
                            clean_extract = cls._truncate_snippet(extract, 350)
                            url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
                            results.append({
                                "title": title,
                                "snippet": clean_extract,
                                "source": f"Wikipedia ({title})",
                                "url": url,
                                "type": "encyclopedia"
                            })
                            break
        except Exception as e:
            logger.error(f"[WebSearchEngine] Wikipedia lookup error: {e}", exc_info=True)

        return results

    @classmethod
    def _search_google_news(cls, query: str, max_items: int = 3) -> List[Dict[str, Any]]:
        results = []
        try:
            search_query = f"Formula 1 {query}" if "f1" not in query.lower() and "formula" not in query.lower() else query
            rss_url = f"{cls.GOOGLE_NEWS_RSS_URL}?q={urllib.parse.quote(search_query)}&hl=en-US&gl=US&ceid=US:en"
            headers = {"User-Agent": cls.USER_AGENT}
            resp = requests.get(rss_url, headers=headers, timeout=6.0)
            if resp.status_code != 200:
                logger.warning(f"[WebSearchEngine] Google News RSS returned status {resp.status_code}")
                return results

            root = ET.fromstring(resp.content)
            channel = root.find("channel")
            if channel is None:
                return results

            items = channel.findall("item")
            for item in items[:max_items]:
                raw_title = item.findtext("title") or ""
                link = item.findtext("link") or ""
                source_elem = item.find("source")
                source_name = source_elem.text if source_elem is not None else "Motorsport News"
                
                # Title usually formatted as: "Headline - Publisher"
                headline = raw_title
                if " - " in raw_title:
                    parts = raw_title.rsplit(" - ", 1)
                    headline = parts[0].strip()
                    if not source_name or source_name == "Motorsport News":
                        source_name = parts[1].strip()

                snippet = cls._truncate_snippet(headline, 250)
                results.append({
                    "title": headline,
                    "snippet": snippet,
                    "source": source_name,
                    "url": link,
                    "type": "news"
                })
        except Exception as e:
            logger.error(f"[WebSearchEngine] Google News RSS lookup error: {e}", exc_info=True)

        return results

    @staticmethod
    def _truncate_snippet(text: str, max_chars: int = 300) -> str:
        if len(text) <= max_chars:
            return text
        truncated = text[:max_chars]
        last_punct = max(truncated.rfind("."), truncated.rfind(";"), truncated.rfind("?"))
        if last_punct > 100:
            return truncated[:last_punct + 1]
        return truncated.rstrip() + "..."
