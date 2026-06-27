#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
strava_client.py — Strava OAuth 客户端：自动刷新 access token + 拉取活动。

凭据优先从同目录 .env 读取（本地，已 gitignore）；缺失时回退到环境变量
（CI 由 GitHub Secrets 注入 STRAVA_CLIENT_ID / SECRET / REFRESH_TOKEN）：
    STRAVA_CLIENT_ID
    STRAVA_CLIENT_SECRET
    STRAVA_REFRESH_TOKEN   ← 首次用授权换到的那个；之后会自动滚动更新

access token 6 小时过期，本模块用 refresh token 自动续期，并把最新的
{access_token, refresh_token, expires_at} 缓存到 .strava_tokens.json。
注意：每次续期 Strava 会返回新的 refresh_token，旧的立即失效——本模块始终用缓存里最新的。

只用标准库（urllib），无需额外依赖。
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

_HERE = Path(__file__).parent
TOKEN_FILE = _HERE / ".strava_tokens.json"


def _load_env():
    """从 .env 读取 STRAVA_*（无第三方依赖）。"""
    p = _HERE / ".env"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()
CLIENT_ID = os.environ.get("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.environ.get("STRAVA_CLIENT_SECRET")
REFRESH_TOKEN = os.environ.get("STRAVA_REFRESH_TOKEN")  # 仅作首次种子

RUN_SPORTS = {"Run", "TrailRun", "VirtualRun"}  # 只把这些算进跑步课表


def _req(method, path_or_url, data=None, headers=None, full=False):
    url = path_or_url if full else "https://www.strava.com" + path_or_url
    body = None
    if method == "GET" and data:
        sep = "&" if "?" in url else "?"
        url += sep + urllib.parse.urlencode(data)
    elif data:
        body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"Strava {method} {url} -> HTTP {e.code}: {text}") from None


def _save_tokens(t):
    TOKEN_FILE.write_text(json.dumps(t), encoding="utf-8")


def _load_tokens():
    if TOKEN_FILE.exists():
        try:
            return json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def configured():
    """是否已配置 Strava 凭据。"""
    return bool(CLIENT_ID and CLIENT_SECRET and REFRESH_TOKEN)


def get_access_token(force_refresh=False):
    """返回有效 access token；临近过期则用 refresh token 续期。"""
    t = _load_tokens()
    now = time.time()
    if not force_refresh and t and t.get("access_token") and t.get("expires_at", 0) - now > 120:
        return t["access_token"]
    # 用缓存里最新的 refresh token，否则回退到 .env 的初始值
    rt = (t or {}).get("refresh_token") or REFRESH_TOKEN
    resp = _req("POST", "/api/v3/oauth/token", {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": rt,
    })
    _save_tokens({
        "access_token": resp["access_token"],
        "refresh_token": resp["refresh_token"],
        "expires_at": resp["expires_at"],
    })
    return resp["access_token"]


def current_refresh_token():
    """返回最新的 refresh_token（刷新后取缓存，未刷新则回退到初始 env 值）。

    供 CI 把轮转后的 refresh_token 写回 secret——Strava 每次刷新都返回新的、
    旧的立即失效，必须持久化到下次运行。
    """
    t = _load_tokens()
    return (t or {}).get("refresh_token") or REFRESH_TOKEN


def list_activities(after_epoch=None, before_epoch=None, per_page=100):
    """拉取活动，自动分页。after/before 为 epoch 秒；返回原始 SummaryActivity 列表。"""
    out, page = [], 1
    while True:
        params = {"page": page, "per_page": per_page}
        if after_epoch is not None:
            params["after"] = after_epoch
        if before_epoch is not None:
            params["before"] = before_epoch
        batch = _req("GET", "/api/v3/athlete/activities", params,
                     headers={"Authorization": "Bearer " + get_access_token()})
        if not batch:
            break
        out.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
    return out


def get_activity(activity_id, include_all_efforts=False):
    """GET /activities/{id} → DetailedActivity（含 description 等详情；列表接口不带描述）。"""
    return _req("GET", f"/api/v3/activities/{activity_id}",
                {"include_all_efforts": str(bool(include_all_efforts)).lower()},
                headers={"Authorization": "Bearer " + get_access_token()})


if __name__ == "__main__":
    # 自检：换 token + 拉最近 5 条
    if not configured():
        raise SystemExit("未配置 .env (STRAVA_CLIENT_ID/SECRET/REFRESH_TOKEN)")
    tk = get_access_token()
    print("access_token:", tk[:10] + "…")
    acts = list_activities()[:5]
    print(f"最近 {len(acts)} 条活动：")
    for a in acts:
        print(f"  {a.get('start_date_local')}  {a.get('sport_type'):<10} "
              f"{a.get('distance', 0)/1000:.2f}km  {a.get('name')}")
