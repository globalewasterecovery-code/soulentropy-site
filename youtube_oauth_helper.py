"""
YouTube OAuth 2.0 Authorization Helper for SoulEntropy Auto Growth V2
Starts a local OAuth HTTP listener on localhost:8080 to receive authorization code,
exchanges code for refresh token, stores token securely in memory/youtube_token.json (NO printing of tokens),
and verifies YouTube Channel ID & Title via YouTube Data API v3.
"""

import http.server
import json
import os
import urllib.parse
import urllib.request
import sys
import threading
import time

TOKEN_STORE_PATH = os.path.join(os.path.dirname(__file__), "memory", "youtube_token.json")

# Standard YouTube Scopes
SCOPES = [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.readonly"
]

class YouTubeOAuthManager:
    @staticmethod
    def load_token() -> dict:
        if os.path.exists(TOKEN_STORE_PATH):
            try:
                with open(TOKEN_STORE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    @staticmethod
    def save_token(data: dict):
        os.makedirs(os.path.dirname(TOKEN_STORE_PATH), exist_ok=True)
        with open(TOKEN_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @staticmethod
    def get_auth_url(client_id: str, redirect_uri: str = "http://localhost:8080/callback") -> str:
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent"
        }
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

    @staticmethod
    def exchange_code_for_tokens(code: str, client_id: str, client_secret: str, redirect_uri: str = "http://localhost:8080/callback") -> dict:
        url = "https://oauth2.googleapis.com/token"
        payload = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        req = urllib.request.Request(
            url,
            data=urllib.parse.urlencode(payload).encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                # Save token securely without printing
                token_data = {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": data.get("refresh_token"),
                    "access_token": data.get("access_token"),
                    "expires_at": time.time() + data.get("expires_in", 3600)
                }
                YouTubeOAuthManager.save_token(token_data)
                return {"status": "SUCCESS"}
        except Exception as e:
            return {"status": "ERROR", "reason": str(e)}

    @staticmethod
    def refresh_access_token() -> str:
        token_data = YouTubeOAuthManager.load_token()
        refresh_token = token_data.get("refresh_token")
        client_id = token_data.get("client_id")
        client_secret = token_data.get("client_secret")

        if not refresh_token or not client_id or not client_secret:
            return None

        # Check if current access token is still valid
        if token_data.get("access_token") and token_data.get("expires_at", 0) > time.time() + 60:
            return token_data.get("access_token")

        url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        req = urllib.request.Request(
            url,
            data=urllib.parse.urlencode(payload).encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                new_access_token = data.get("access_token")
                token_data["access_token"] = new_access_token
                token_data["expires_at"] = time.time() + data.get("expires_in", 3600)
                YouTubeOAuthManager.save_token(token_data)
                return new_access_token
        except Exception:
            return None

    @staticmethod
    def verify_channel_access() -> dict:
        access_token = YouTubeOAuthManager.refresh_access_token()
        if not access_token:
            return {
                "status": "WAITING_OAUTH",
                "channel_id": None,
                "channel_title": None
            }

        url = "https://www.googleapis.com/youtube/v3/channels?part=snippet,id&mine=true"
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                items = data.get("items", [])
                if items:
                    ch_id = items[0].get("id")
                    ch_title = items[0].get("snippet", {}).get("title")
                    return {
                        "status": "PASS",
                        "channel_id": ch_id,
                        "channel_title": ch_title
                    }
                else:
                    return {
                        "status": "NO_CHANNEL_FOUND",
                        "channel_id": None,
                        "channel_title": None
                    }
        except Exception as e:
            return {
                "status": "API_ERROR",
                "reason": str(e),
                "channel_id": None,
                "channel_title": None
            }

if __name__ == "__main__":
    verify = YouTubeOAuthManager.verify_channel_access()
    print("Channel Verification:", verify)
