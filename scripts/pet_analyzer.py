#!/usr/bin/env python3
"""PET Analyzer: Claude Code token consumption tracker for Monster Roguelike."""
import glob, json, os
from datetime import datetime, timezone, timedelta
from pathlib import Path

JST = timezone(timedelta(hours=9))
ROOT = Path(__file__).parent.parent
JSONL_DIR = Path.home() / ".claude/projects/-Users-user-Documents-GitHub-monster-roguelike"
HISTORY_FILE = ROOT / ".claude/metrics_history.json"
CHECKPOINTS_FILE = ROOT / "dev/checkpoints.json"
DASHBOARD_FILE = ROOT / "docs/metrics_dashboard.html"


def load_history():
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return {"project_name": "Monster Roguelike", "entries": []}


def parse_today_sessions():
    now_jst = datetime.now(JST)
    today_start_utc = now_jst.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    sessions = {}
    for path in glob.glob(str(JSONL_DIR / "*.jsonl")):
        if datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc) < today_start_utc:
            continue
        with open(path, encoding="utf-8", errors="ignore") as f:
            for line in f:
                try:
                    e = json.loads(line.strip())
                except (json.JSONDecodeError, ValueError):
                    continue
                if e.get("type") != "assistant" or e.get("isSidechain"):
                    continue
                u = e.get("message", {}).get("usage", {})
                if not u:
                    continue
                sid = e.get("sessionId", "unknown")
                if sid not in sessions:
                    sessions[sid] = dict(input=0, output=0, cache_read=0, cache_create=0)
                sessions[sid]["input"] += u.get("input_tokens", 0)
                sessions[sid]["output"] += u.get("output_tokens", 0)
                sessions[sid]["cache_read"] += u.get("cache_read_input_tokens", 0)
                sessions[sid]["cache_create"] += u.get("cache_creation_input_tokens", 0)
    return sessions


def make_entry(sid, d):
    inp, cr = d["input"], d["cache_read"]
    return {
        "recorded_at": datetime.now(JST).isoformat(),
        "date_jst": datetime.now(JST).strftime("%Y-%m-%d"),
        "session_id": sid,
        "input_tokens": inp, "output_tokens": d["output"],
        "cache_read_tokens": cr, "cache_creation_tokens": d["cache_create"],
        "effective_tokens": inp + d["output"],
        "cached_rate": round(cr / (cr + inp) * 100, 1) if (cr + inp) > 0 else 0.0,
    }


def aggregate_daily(entries):
    daily = {}
    for e in entries:
        d = e["date_jst"]
        if d not in daily:
            daily[d] = dict(eff=0, cr_sum=0, n=0, sessions=set())
        daily[d]["eff"] += e["effective_tokens"]
        daily[d]["cr_sum"] += e["cached_rate"]
        daily[d]["n"] += 1
        daily[d]["sessions"].add(e["session_id"])
    dates = sorted(daily.keys())
    return dates, daily


def build_html(history, checkpoints):
    dates, daily = aggregate_daily(history["entries"])
    eff = [daily[d]["eff"] for d in dates]
    cache = [round(daily[d]["cr_sum"] / daily[d]["n"], 1) if daily[d]["n"] else 0 for d in dates]
    cp_map = {cp["date"]: cp["label"] for cp in checkpoints}
    ann_js = "".join(
        f'"{d}":{{type:"line",xMin:{i},xMax:{i},borderColor:"#f59e0b",borderWidth:2,'
        f'borderDash:[5,5],label:{{content:{json.dumps(cp_map[d])},display:true,'
        f'position:"start",color:"#f59e0b",font:{{size:10}}}}}},'
        for i, d in enumerate(dates) if d in cp_map
    )
    recent = dates[-7:]
    kpi_eff = sum(daily[d]["eff"] for d in recent)
    kpi_cache = round(sum(daily[d]["cr_sum"] / daily[d]["n"] for d in recent if daily[d]["n"]) / len(recent), 1) if recent else 0
    kpi_sess = sum(len(daily[d]["sessions"]) for d in recent)
    ts = datetime.now(JST).strftime("%Y-%m-%d %H:%M JST")
    return (ROOT / "scripts/pet_template.html").read_text().format(
        ts=ts, kpi_eff=f"{kpi_eff:,}", kpi_cache=kpi_cache, kpi_sess=kpi_sess,
        labels=json.dumps(dates), eff=json.dumps(eff), cache=json.dumps(cache), ann=ann_js,
    )


def main():
    history = load_history()
    recorded = {e["session_id"] for e in history["entries"]}
    sessions = parse_today_sessions()
    added = sum(1 for sid, d in sessions.items() if sid not in recorded and history["entries"].append(make_entry(sid, d)) is None)
    if added:
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2))
    checkpoints = json.loads(CHECKPOINTS_FILE.read_text()) if CHECKPOINTS_FILE.exists() else []
    DASHBOARD_FILE.parent.mkdir(parents=True, exist_ok=True)
    DASHBOARD_FILE.write_text(build_html(history, checkpoints))
    print(f"PET: +{added} sessions, dashboard → {DASHBOARD_FILE}")


if __name__ == "__main__":
    main()
