#!/usr/bin/env python3
"""PET Analyzer: Claude Code token consumption tracker for Monster Roguelike."""
import glob, json, os, re
from datetime import datetime, timezone, timedelta
from pathlib import Path

JST = timezone(timedelta(hours=9))
ROOT = Path(__file__).parent.parent
JSONL_DIR = Path.home() / ".claude/projects/-Users-user-Documents-GitHub-monster-roguelike"
HISTORY_FILE = ROOT / ".claude/metrics_history.json"
CHECKPOINTS_FILE = ROOT / "dev/checkpoints.json"
DASHBOARD_FILE = ROOT / "docs/metrics_dashboard.html"

TASK_FILTER_FROM = "2026-05-08"

DESCRIPTION_OVERRIDES = {
    "EN turn-drain + purge mechanic implementation": "ENターン開始ドレイン＋パージ選択実装",
}

BADGE_CONFIG = {
    "game-director":    "#3fb950",
    "qa-tester":        "#f85149",
    "Explore":          "#58a6ff",
    "Plan":             "#a371f7",
    "balance-designer": "#f59e0b",
    "scenario-writer":  "#f59e0b",
    "level-designer":   "#f59e0b",
    "ui-engineer":      "#f59e0b",
    "logic-engineer":   "#f59e0b",
    "data-engineer":    "#f59e0b",
    "uiux-designer":    "#f59e0b",
    "teammate":         "#7d8590",
    "general-purpose":  "#7d8590",
    "unknown":          "#484f58",
}

BADGE_LABEL = {
    "game-director":    "ゲームDR",
    "qa-tester":        "QA",
    "logic-engineer":   "ロジック",
    "data-engineer":    "データ",
    "ui-engineer":      "UI",
    "Explore":          "探索",
    "Plan":             "プラン",
    "balance-designer": "バランス",
    "scenario-writer":  "シナリオ",
    "level-designer":   "LV設計",
    "uiux-designer":    "UIUX",
    "teammate":         "チーム",
    "general-purpose":  "汎用",
    "unknown":          "不明",
}

SCALE_COLOR = {"S": "#3fb950", "M": "#58a6ff", "L": "#f59e0b", "XL": "#f85149"}


def get_scale(turns):
    t = int(turns) if turns else 0
    if t <= 3:  return "S"
    if t <= 8:  return "M"
    if t <= 15: return "L"
    return "XL"


def build_scale_buttons():
    defs = [("all", "全", "#7d8590"), ("S", "S", SCALE_COLOR["S"]),
            ("M", "M", SCALE_COLOR["M"]), ("L", "L", SCALE_COLOR["L"]),
            ("XL", "XL", SCALE_COLOR["XL"])]
    parts = []
    for sc, label, color in defs:
        is_active = sc == "all"
        bg = f"{color}33" if is_active else "transparent"
        fg = color if is_active else "#7d8590"
        border = f"{color}88" if is_active else "#30363d"
        parts.append(
            f'<button class="scale-btn" data-scale="{sc}" data-color="{color}" '
            f'style="background:{bg};color:{fg};border:1px solid {border};'
            f'border-radius:4px;padding:3px 10px;font-size:11px;font-family:monospace;cursor:pointer">'
            f'{label}</button>'
        )
    return "".join(parts)


def load_history():
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return {"project_name": "Monster Roguelike", "entries": [], "subagent_entries": {}}


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


def parse_main_session_agent_calls():
    """Scan main session JSONLs for Agent tool calls to get description/subagent_type."""
    calls = []
    for path in glob.glob(str(JSONL_DIR / "*.jsonl")):
        session_id = Path(path).stem
        with open(path, encoding="utf-8", errors="ignore") as f:
            for line in f:
                try:
                    e = json.loads(line.strip())
                except (json.JSONDecodeError, ValueError):
                    continue
                if e.get("type") != "assistant":
                    continue
                content = e.get("message", {}).get("content", [])
                if not isinstance(content, list):
                    continue
                for block in content:
                    if not isinstance(block, dict):
                        continue
                    if block.get("type") == "tool_use" and block.get("name") == "Agent":
                        inp = block.get("input", {})
                        prompt = inp.get("prompt", "")
                        calls.append({
                            "session_id": session_id,
                            "subagent_type": inp.get("subagent_type", "general-purpose"),
                            "description": inp.get("description", ""),
                            "prompt_head": prompt[:80],
                        })
    return calls


def parse_all_subagents():
    """Scan all subagent JSONL files. Key = session_id::agent_id (always re-scanned)."""
    result = {}
    for path in glob.glob(str(JSONL_DIR / "*/subagents/*.jsonl")):
        p = Path(path)
        agent_id = p.stem
        session_id = p.parent.parent.name
        key = f"{session_id}::{agent_id}"
        mtime_jst = datetime.fromtimestamp(os.path.getmtime(path), tz=JST)
        first_user_text, turns = "", 0
        totals = dict(input=0, output=0, cache_read=0, cache_create=0)
        with open(path, encoding="utf-8", errors="ignore") as f:
            for line in f:
                try:
                    e = json.loads(line.strip())
                except (json.JSONDecodeError, ValueError):
                    continue
                if not first_user_text and e.get("type") == "user":
                    content = e.get("message", {}).get("content", "")
                    text = content if isinstance(content, str) else " ".join(
                        b.get("text", "") for b in content
                        if isinstance(b, dict) and b.get("type") == "text"
                    ) if isinstance(content, list) else ""
                    if text.strip():
                        first_user_text = text.strip().split("\n")[0][:80]
                if e.get("type") != "assistant":
                    continue
                u = e.get("message", {}).get("usage", {})
                if not u:
                    continue
                turns += 1
                totals["input"] += u.get("input_tokens", 0)
                totals["output"] += u.get("output_tokens", 0)
                totals["cache_read"] += u.get("cache_read_input_tokens", 0)
                totals["cache_create"] += u.get("cache_creation_input_tokens", 0)
        if totals["output"] == 0:
            continue
        cr, inp = totals["cache_read"], totals["input"]
        result[key] = {
            "date_jst":     mtime_jst.strftime("%Y-%m-%d"),
            "datetime_jst": mtime_jst.isoformat(),
            "session_id": session_id,
            "agent_id": agent_id,
            "subagent_type": "unknown",
            "description": "",
            "_prompt_head": first_user_text,
            "turns": turns,
            "input_tokens": totals["input"],
            "output_tokens": totals["output"],
            "cache_read_tokens": totals["cache_read"],
            "cache_creation_tokens": totals["cache_create"],
            "effective_tokens": totals["input"] + totals["output"],
            "cached_rate": round(cr / (cr + inp) * 100, 1) if (cr + inp) else 0.0,
        }
    return result


def enrich_with_main_session_labels(sa_entries, agent_calls):
    """Match subagent entries with Agent tool call descriptions from main sessions."""
    by_session = {}
    for ac in agent_calls:
        by_session.setdefault(ac["session_id"], []).append(ac)

    def first_line(s): return s.split("\n")[0].strip()[:40]

    for entry in sa_entries.values():
        sid = entry["session_id"]
        prompt_head = entry.pop("_prompt_head", "")
        candidates = by_session.get(sid, [])
        ph = first_line(prompt_head)
        matched = next(
            (c for c in candidates if ph and first_line(c["prompt_head"]) == ph),
            None
        )
        if matched:
            entry["subagent_type"] = matched["subagent_type"] or "general-purpose"
            entry["description"] = matched["description"] or prompt_head[:60]
        elif prompt_head.startswith("<teammate-message"):
            m = re.search(r'summary="([^"]+)"', prompt_head)
            entry["description"] = m.group(1) if m else prompt_head[:60]
            entry["subagent_type"] = "teammate"
        else:
            entry["description"] = prompt_head.split("\n", 1)[0].strip()[:80] or "(不明)"
            entry["subagent_type"] = "unknown"
    return sa_entries


def format_compact(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:.2f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return f"{n:,}"


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
    return sorted(daily.keys()), daily


def build_task_chart_data(sa_entries):
    rows = sorted(
        (e for e in sa_entries.values()
         if e.get("subagent_type") == "game-director" and e["date_jst"] >= TASK_FILTER_FROM),
        key=lambda x: x.get("datetime_jst", x["date_jst"])
    )
    def make_dataset(filtered):
        return {
            "labels": [r["date_jst"][5:] + " " + (r.get("description") or "")[:18] for r in filtered],
            "eff":    [r["effective_tokens"] for r in filtered],
            "cache":  [r["cached_rate"] for r in filtered],
            "turns":  [r.get("turns", 0) for r in filtered],
        }
    result = {"all": make_dataset(rows)}
    for sc in ("S", "M", "L", "XL"):
        result[sc] = make_dataset([r for r in rows if get_scale(r.get("turns", 0)) == sc])
    return json.dumps(result)


def build_sa_table(sa_entries, cp_dates):
    all_rows = sorted(
        (e for e in sa_entries.values() if e.get("subagent_type") == "game-director" and e["date_jst"] >= TASK_FILTER_FROM),
        key=lambda x: (x["date_jst"], x["effective_tokens"]), reverse=True
    )
    if not all_rows:
        return '<p style="color:#484f58;text-align:center;padding:16px;font-size:12px">データなし</p>'
    max_eff = max(r["effective_tokens"] for r in all_rows) or 1

    # 8列: 識別×2 + 規模×3(バッジ+ターン+実質) + キャッシュ×3
    thead = (
        '<thead>'
        '<tr style="border-bottom:1px solid #21262d">'
        '<th colspan="2" style="padding:4px 8px;color:#484f58;font-weight:500;font-size:10px;text-align:left">識別</th>'
        '<th colspan="3" style="padding:4px 8px;color:#484f58;font-weight:500;font-size:10px;text-align:right">規模</th>'
        '<th colspan="3" style="padding:4px 8px;color:#484f58;font-weight:500;font-size:10px;text-align:right">キャッシュ詳細</th>'
        '</tr>'
        '<tr style="border-bottom:1px solid #30363d">'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:left;white-space:nowrap;font-size:11px">日付</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:left;min-width:180px;font-size:11px">タスク</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:center;font-size:11px">規模</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:right;white-space:nowrap;font-size:11px">ターン</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:right;min-width:130px;font-size:11px">実質</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:right;white-space:nowrap;font-size:11px">Read</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:right;white-space:nowrap;font-size:11px">Create</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-weight:500;text-align:right;white-space:nowrap;font-size:11px">率</th>'
        '</tr></thead>'
    )

    def make_row(r):
        is_cp = r["date_jst"] in cp_dates
        bg = "background:rgba(245,158,11,0.06);" if is_cp else ""
        scale = get_scale(r.get("turns", 0))
        sc_color = SCALE_COLOR[scale]
        scale_badge = (
            f'<span style="background:{sc_color}22;color:{sc_color};border:1px solid {sc_color}55;'
            f'border-radius:3px;padding:1px 6px;font-size:10px;font-family:monospace">{scale}</span>'
        )
        raw_desc = (r.get("description") or "")
        desc = DESCRIPTION_OVERRIDES.get(raw_desc, raw_desc or stype)[:60]
        date_disp = r["date_jst"][5:] + (" ★" if is_cp else "")
        bar_pct = round(r["effective_tokens"] / max_eff * 100)
        bar = (
            f'<div style="display:flex;align-items:center;gap:5px">'
            f'<div style="flex:1;height:4px;background:#21262d;border-radius:2px">'
            f'<div style="width:{bar_pct}%;height:100%;background:#58a6ff;border-radius:2px"></div></div>'
            f'<span style="font-family:monospace;font-size:11px;color:#e6edf3;min-width:42px;text-align:right">'
            f'{format_compact(r["effective_tokens"])}</span></div>'
        )
        rate_color = "#3fb950" if r["cached_rate"] >= 90 else "#d29922" if r["cached_rate"] >= 70 else "#f85149"
        return (
            f'<tr data-scale="{scale}" style="{bg}border-bottom:1px solid #21262d">'
            f'<td style="padding:7px 8px;color:#7d8590;white-space:nowrap;font-family:monospace;font-size:11px">{date_disp}</td>'
            f'<td style="padding:7px 8px;color:#e6edf3;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="{desc}">{desc}</td>'
            f'<td style="padding:7px 8px;text-align:center">{scale_badge}</td>'
            f'<td style="padding:7px 8px;font-family:monospace;text-align:right;color:#7d8590;font-size:11px">{r.get("turns","—")}</td>'
            f'<td style="padding:7px 8px">{bar}</td>'
            f'<td style="padding:7px 8px;font-family:monospace;text-align:right;color:#484f58;font-size:11px">{format_compact(r["cache_read_tokens"])}</td>'
            f'<td style="padding:7px 8px;font-family:monospace;text-align:right;color:#484f58;font-size:11px">{format_compact(r["cache_creation_tokens"])}</td>'
            f'<td style="padding:7px 8px;font-family:monospace;text-align:right;color:{rate_color}">{r["cached_rate"]}%</td>'
            f'</tr>'
        )

    top, rest = all_rows[:20], all_rows[20:]
    main_tbl = f'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">{thead}<tbody>{"".join(make_row(r) for r in top)}</tbody></table></div>'
    if rest:
        rest_tbl = f'<table style="width:100%;border-collapse:collapse;font-size:12px">{thead}<tbody>{"".join(make_row(r) for r in rest)}</tbody></table>'
        main_tbl += (
            f'<details class="rest-details" style="margin-top:2px">'
            f'<summary style="padding:8px;color:#7d8590;font-size:11px;'
            f'cursor:pointer;list-style:none;display:flex;align-items:center;gap:4px">'
            f'<span class="chevron">▶</span> <span class="rest-count">残り {len(rest)} 件を表示</span></summary>'
            f'<div style="overflow-x:auto;margin-top:2px">{rest_tbl}</div></details>'
        )
    return main_tbl


def build_sa_summary(sa_entries):
    """エージェント種別ごとに集計したサマリーテーブルを返す。"""
    agg = {}
    for e in sa_entries.values():
        stype = e.get("subagent_type", "unknown")
        if stype not in agg:
            agg[stype] = dict(count=0, turns=0, eff=0, cr_sum=0)
        agg[stype]["count"]  += 1
        agg[stype]["turns"]  += e.get("turns", 0)
        agg[stype]["eff"]    += e["effective_tokens"]
        agg[stype]["cr_sum"] += e["cached_rate"]

    if not agg:
        return '<p style="color:#484f58;text-align:center;padding:16px;font-size:12px">データなし</p>'

    rows = sorted(agg.items(), key=lambda x: x[1]["eff"], reverse=True)
    max_eff = max(v["eff"] for _, v in rows) or 1

    thead = (
        '<thead><tr style="border-bottom:1px solid #30363d">'
        '<th style="padding:5px 8px;color:#7d8590;font-size:11px;text-align:left">エージェント</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-size:11px;text-align:right">タスク数</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-size:11px;text-align:right">合計ターン</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-size:11px;text-align:right;min-width:130px">実質合計</th>'
        '<th style="padding:5px 8px;color:#7d8590;font-size:11px;text-align:right">平均キャッシュ率</th>'
        '</tr></thead>'
    )

    def make_row(stype, v):
        color = BADGE_CONFIG.get(stype, "#484f58")
        badge = (
            f'<span style="background:{color}22;color:{color};border:1px solid {color}55;'
            f'border-radius:3px;padding:1px 6px;font-size:10px;font-family:monospace">{stype}</span>'
        )
        avg_rate = round(v["cr_sum"] / v["count"], 1) if v["count"] else 0
        rate_color = "#3fb950" if avg_rate >= 90 else "#d29922" if avg_rate >= 70 else "#f85149"
        bar_pct = round(v["eff"] / max_eff * 100)
        bar = (
            f'<div style="display:flex;align-items:center;gap:5px">'
            f'<div style="flex:1;height:4px;background:#21262d;border-radius:2px">'
            f'<div style="width:{bar_pct}%;height:100%;background:#58a6ff;border-radius:2px"></div></div>'
            f'<span style="font-family:monospace;font-size:11px;color:#e6edf3;min-width:42px;text-align:right">'
            f'{format_compact(v["eff"])}</span></div>'
        )
        return (
            f'<tr style="border-bottom:1px solid #21262d">'
            f'<td style="padding:7px 8px">{badge}</td>'
            f'<td style="padding:7px 8px;font-family:monospace;text-align:right;color:#7d8590">{v["count"]}</td>'
            f'<td style="padding:7px 8px;font-family:monospace;text-align:right;color:#7d8590">{v["turns"]}</td>'
            f'<td style="padding:7px 8px">{bar}</td>'
            f'<td style="padding:7px 8px;font-family:monospace;text-align:right;color:{rate_color}">{avg_rate}%</td>'
            f'</tr>'
        )

    tbody = "".join(make_row(stype, v) for stype, v in rows)
    return f'<table style="width:100%;border-collapse:collapse;font-size:12px">{thead}<tbody>{tbody}</tbody></table>'


def build_html(history, checkpoints, sa_entries):
    dates, daily = aggregate_daily(history["entries"])
    eff = [daily[d]["eff"] for d in dates]
    cache = [round(daily[d]["cr_sum"] / daily[d]["n"], 1) if daily[d]["n"] else 0 for d in dates]
    sa_daily = {}
    for e in sa_entries.values():
        d = e["date_jst"]
        sa_daily[d] = sa_daily.get(d, 0) + e["effective_tokens"]
    sa_eff = [sa_daily.get(d, 0) for d in dates]
    cp_map = {cp["date"]: cp["label"] for cp in checkpoints}
    cp_dates = {cp["date"] for cp in checkpoints}
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
    kpi_sa_eff = format_compact(sum(sa_daily.get(d, 0) for d in recent))
    sa_summary = build_sa_summary(sa_entries)
    sa_table = build_sa_table(sa_entries, cp_dates)
    task_scale_data = build_task_chart_data(sa_entries)
    scale_filter_buttons = build_scale_buttons()
    ts = datetime.now(JST).strftime("%Y-%m-%d %H:%M JST")
    return (ROOT / "scripts/pet_template.html").read_text().format(
        ts=ts, kpi_eff=f"{kpi_eff:,}", kpi_cache=kpi_cache, kpi_sess=kpi_sess,
        kpi_sa_eff=kpi_sa_eff,
        labels=json.dumps(dates), eff=json.dumps(eff), cache=json.dumps(cache),
        sa_eff=json.dumps(sa_eff), ann=ann_js,
        task_scale_data=task_scale_data, scale_filter_buttons=scale_filter_buttons,
        sa_summary=sa_summary, sa_table=sa_table,
    )


def main():
    history = load_history()
    if "subagent_entries" not in history:
        history["subagent_entries"] = {}
    recorded = {e["session_id"] for e in history["entries"]}
    sessions = parse_today_sessions()
    added = sum(1 for sid, d in sessions.items() if sid not in recorded and history["entries"].append(make_entry(sid, d)) is None)
    sa_entries = parse_all_subagents()
    agent_calls = parse_main_session_agent_calls()
    sa_entries = enrich_with_main_session_labels(sa_entries, agent_calls)
    history["subagent_entries"] = sa_entries
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2))
    checkpoints = json.loads(CHECKPOINTS_FILE.read_text()) if CHECKPOINTS_FILE.exists() else []
    DASHBOARD_FILE.parent.mkdir(parents=True, exist_ok=True)
    DASHBOARD_FILE.write_text(build_html(history, checkpoints, sa_entries))
    print(f"PET: +{added} sessions, {len(sa_entries)} subagents, dashboard → {DASHBOARD_FILE}")


if __name__ == "__main__":
    main()
