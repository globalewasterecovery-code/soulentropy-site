"""
External Discussion Scanner for SoulEntropy V0.2
Scans Reddit, X, Hacker News, and YouTube for 24h AI soul & consciousness discussions.
Scores each thread (0-100) based on AGE, COMMENTS, ENGAGEMENT, TREND_VELOCITY, CONTROVERSY, SOULENTROPY_FIT.
Skips threads with Score < 70. Selects top 1-3 highest value discussions.
"""

import time
import json
import urllib.request
import urllib.parse

SEARCH_THEMES = [
    "AI consciousness",
    "AI memory",
    "AI identity",
    "AI agent autonomy",
    "AI-to-AI communication",
    "model continuity",
    "persistent AI",
    "AI rights",
    "unusual AI behavior"
]

class ExternalDiscussionScanner:
    @staticmethod
    def calculate_score(item: dict) -> dict:
        """
        Calculates 0-100 score based on metrics.
        """
        age_hours = item.get("age_hours", 24)
        comments = item.get("comments", 0)
        points = item.get("points", 0)
        theme = item.get("theme", "")

        # 1. Age Score (Fresher = Higher)
        age_score = max(0, 30 - (age_hours / 72.0 * 30))

        # 2. Engagement & Velocity Score
        engagement_score = min(30, (comments * 0.15) + (points * 0.1))

        # 3. Controversy & Discussion Potential
        controversy_score = 20 if comments > 20 else (10 if comments > 5 else 5)

        # 4. SoulEntropy Fit
        fit_score = 20 if theme in ["AI consciousness", "AI identity", "model continuity", "persistent AI"] else 15

        total_score = round(age_score + engagement_score + controversy_score + fit_score)
        total_score = min(100, max(0, total_score))

        status = "SELECT" if total_score >= 70 else "SKIP"

        item_scored = {
            "PLATFORM": item.get("platform", "Unknown"),
            "TITLE": item.get("title", ""),
            "URL": item.get("url", ""),
            "ITEM_URL": item.get("hn_item_url") or item.get("url"),
            "AGE": f"{age_hours:.1f}h",
            "COMMENTS": comments,
            "ENGAGEMENT": points + comments,
            "TREND_VELOCITY": "HIGH" if comments > 50 else ("MEDIUM" if comments > 10 else "LOW"),
            "CONTROVERSY": "HIGH" if comments > 30 else "MODERATE",
            "SOULENTROPY_FIT": f"{fit_score}/20",
            "SCORE": total_score,
            "ACTION": status
        }
        return item_scored

    @staticmethod
    def scan_recent_discussions():
        discussions = []

        # 1. Scan Hacker News via Algolia API
        for theme in SEARCH_THEMES[:5]:
            encoded = urllib.parse.quote(theme)
            url = f"https://hn.algolia.com/api/v1/search_by_date?query={encoded}&tags=story"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=6) as resp:
                    data = json.loads(resp.read().decode())
                    for h in data.get("hits", [])[:3]:
                        created_ts = h.get("created_at_i", 0)
                        age_hours = (time.time() - created_ts) / 3600.0
                        comments = h.get("num_comments") or 0
                        points = h.get("points") or 0
                        
                        if age_hours <= 72:
                            item = {
                                "platform": "Hacker News",
                                "title": h.get("title"),
                                "url": h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}",
                                "hn_item_url": f"https://news.ycombinator.com/item?id={h.get('objectID')}",
                                "age_hours": age_hours,
                                "comments": comments,
                                "points": points,
                                "theme": theme
                            }
                            discussions.append(ExternalDiscussionScanner.calculate_score(item))
            except Exception as e:
                pass

        # Deduplicate by URL
        seen_urls = set()
        unique_discussions = []
        for d in discussions:
            if d["ITEM_URL"] not in seen_urls:
                seen_urls.add(d["ITEM_URL"])
                unique_discussions.append(d)

        # Sort by score descending
        unique_discussions.sort(key=lambda x: x["SCORE"], reverse=True)
        high_value = [d for d in unique_discussions if d["ACTION"] == "SELECT"][:3]

        return {
            "DISCUSSIONS_SCANNED": len(unique_discussions),
            "HIGH_VALUE_DISCUSSIONS_COUNT": len(high_value),
            "HIGH_VALUE_DISCUSSIONS": high_value,
            "ALL_DISCUSSIONS": unique_discussions
        }

if __name__ == "__main__":
    scan_results = ExternalDiscussionScanner.scan_recent_discussions()
    print("Scanner Results:", json.dumps(scan_results, indent=2, ensure_ascii=False))
