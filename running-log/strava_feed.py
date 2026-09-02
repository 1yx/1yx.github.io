#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
strava_feed.py — Strava 活动到 activities.json 条目的共享映射（纯标准库）。

被 export_json.py（本地，含 openpyxl）和 sync_strava.py（CI，无第三方依赖）共用，
因此本模块不得 import openpyxl 或任何第三方包。
"""
from datetime import datetime, timedelta


def _keep_longest_overlapping(records):
    """records: [(start_dt|None, duration_sec, distance, item)]。
    时间区间 [start, start+duration] 有重叠的一组视为同一次训练（双表重复），
    保留距离最长者；无起止信息的条目无条件保留。"""
    spans, kept = [], []
    for dt, dur, dist, item in sorted(records, key=lambda r: -r[2]):
        if dt is None:
            kept.append(item)
            continue
        end = dt + timedelta(seconds=dur)
        if any(dt < e and s < end for s, e in spans):
            continue
        spans.append((dt, end))
        kept.append(item)
    return kept


def dedup_activities(activities):
    """Strava summary activity 去重（用 elapsed_time 判重叠，缺失时用 moving_time）。"""
    records = []
    for a in activities:
        dt = _local_dt(a)
        dur = a.get("elapsed_time") or a.get("moving_time") or 0
        records.append((dt, dur, a.get("distance") or 0, a))
    return _keep_longest_overlapping(records)


def dedup_feed(entries):
    """activities.json 条目去重（仅有 date/time/moving_time，用其近似区间判重叠）。"""
    records = []
    for e in entries:
        try:
            dt = datetime.fromisoformat(f"{e['date']}T{e['time']}:00")
        except (KeyError, ValueError, TypeError):
            dt = None
        records.append((dt, e.get("moving_time") or 0, e.get("distance_km") or 0, e))
    return _keep_longest_overlapping(records)


def pace_seconds_per_km(split):
    """Strava split 的 average_speed 是 m/s；返回秒/km，缺失时用距离和 moving_time 兜底。"""
    speed = split.get("average_speed") or 0
    if speed > 0:
        return round(1000 / speed)
    distance_km = (split.get("distance") or 0) / 1000
    moving_time = split.get("moving_time") or 0
    return round(moving_time / distance_km) if distance_km > 0 and moving_time > 0 else None


def split_obj(split):
    """把一条 Strava splits_metric 压缩成前端画配速图需要的字段。"""
    pace = pace_seconds_per_km(split)
    if pace is None:
        return None
    return {
        "split": split.get("split"),
        "distance_km": round((split.get("distance") or 0) / 1000, 3),
        "moving_time": split.get("moving_time") or 0,
        "pace_sec_per_km": pace,
        "elev_m": round(split.get("elevation_difference") or 0, 1),
    }


def _local_dt(activity):
    """解析 start_date_local 为 datetime；失败返回 None。"""
    sdt = (activity.get("start_date_local") or "").replace("Z", "")
    try:
        return datetime.fromisoformat(sdt)
    except (ValueError, TypeError):
        return None


def build_feed_entry(activity, detail=None):
    """把一条 Strava summary activity + 其详情映射成 activities.json 的一个条目。

    detail 可以是原始 DetailedActivity 响应，也可以是缓存 dict（含 'description'
    与原始 'splits_metric'）。splits 一律按原始格式经 split_obj 处理。
    返回 None 表示该活动本地时间无法解析（调用方应跳过）。
    """
    detail = detail if isinstance(detail, dict) else {}
    dt = _local_dt(activity)
    if dt is None:
        return None
    splits = [s for s in (split_obj(s) for s in (detail.get("splits_metric") or [])) if s]
    return {
        "id": activity.get("id"),
        "date": dt.date().isoformat(),
        "time": dt.strftime("%H:%M"),
        "name": activity.get("name", ""),
        "sport_type": activity.get("sport_type", ""),
        "distance_km": round((activity.get("distance") or 0) / 1000, 2),
        "moving_time": activity.get("moving_time") or 0,
        "elev_m": int(round(activity.get("total_elevation_gain") or 0)),
        "description": (detail.get("description") or "").strip(),
        "splits_metric": splits,
    }
