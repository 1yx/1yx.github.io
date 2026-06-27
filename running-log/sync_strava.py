#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_strava.py — CI 用：拉取最近 N 天 Strava 跑步活动，滚动合并进 activities.json。

无第三方依赖（仅标准库 + 同目录 strava_client / strava_feed）。运行：
  python3 running-log/sync_strava.py

环境变量（CI 由 GitHub Secrets 注入；本地可放 running-log/.env）：
  STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REFRESH_TOKEN
  STRAVA_WINDOW_DAYS   可选，默认 30
  RT_OUT               可选，轮转后的 refresh_token 写出路径（供 workflow 写回 secret）

流程：
  1. 用 STRAVA_REFRESH_TOKEN 续期 access_token（每次返回新的 refresh_token，旧失效），
     把最新 refresh_token 写到 RT_OUT，供 workflow 轮转回 secret。
  2. 读现有 activities.json → {id: entry}。
  3. 拉取最近 N 天跑步活动，逐个取详情（splits/描述），build_feed_entry 后并入字典
     （覆盖窗口内旧值以捕获编辑；窗口外旧活动原样保留）。
  4. 按 date+time 倒序写出 activities.json（压缩）。
"""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import strava_client
from strava_feed import build_feed_entry

ROOT = Path(__file__).resolve().parent          # running-log/
REPO = ROOT.parent                               # 博客仓库根
ACTIVITIES_OUT = REPO / "public" / "running" / "calendar" / "activities.json"
RT_OUT = Path(os.environ.get("RT_OUT", str(ROOT / ".refresh_token_out")))
WINDOW_DAYS = int(os.environ.get("STRAVA_WINDOW_DAYS", "30"))


def load_existing():
    if not ACTIVITIES_OUT.exists():
        return {}
    try:
        arr = json.loads(ACTIVITIES_OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return {
        a["id"]: a
        for a in arr
        if isinstance(a, dict) and a.get("id") is not None
    }


def main():
    if not strava_client.configured():
        raise SystemExit("缺少 STRAVA_CLIENT_ID/SECRET/REFRESH_TOKEN 环境变量")

    # 1. 续期 + 捕获新的 refresh_token（Strava 每次刷新都轮转，旧失效）
    strava_client.get_access_token(force_refresh=True)
    new_rt = strava_client.current_refresh_token()
    RT_OUT.parent.mkdir(parents=True, exist_ok=True)
    RT_OUT.write_text(new_rt, encoding="utf-8")
    print(f"已续期 access_token；新 refresh_token 写出 -> {RT_OUT.name}")

    # 2. 读现有
    existing = load_existing()
    print(f"现有 activities.json：{len(existing)} 条")

    # 3. 拉取窗口内跑步活动
    after = int((datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)).timestamp())
    acts = strava_client.list_activities(after_epoch=after)
    runs = [a for a in acts if a.get("sport_type") in strava_client.RUN_SPORTS]
    print(f"最近 {WINDOW_DAYS} 天：活动 {len(acts)} 条，跑步 {len(runs)} 条")

    # 4. 逐个取详情，合并（窗口内覆盖以捕获编辑；详情失败时已存在的不覆盖）
    updated = 0
    for a in runs:
        aid = a.get("id")
        try:
            det = strava_client.get_activity(aid)
            entry = build_feed_entry(a, det)
        except Exception as e:
            print(f"  活动 {aid} 详情失败: {e}")
            # 新活动即便没详情也先用 summary 入库；已存在的沿用旧数据不覆盖
            entry = build_feed_entry(a, {}) if aid not in existing else None
        if entry is not None:
            existing[aid] = entry
            updated += 1

    # 5. 写出
    feed = sorted(existing.values(), key=lambda x: x["date"] + x["time"], reverse=True)
    ACTIVITIES_OUT.parent.mkdir(parents=True, exist_ok=True)
    ACTIVITIES_OUT.write_text(
        json.dumps(feed, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(
        f"已写出 {ACTIVITIES_OUT.relative_to(REPO)}"
        f"（合并后 {len(feed)} 条，本次更新 {updated} 条）"
    )


if __name__ == "__main__":
    main()
