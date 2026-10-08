"""The site's parity fixtures, from the Python reference engine at the vendored commit.

    python scripts/make_fixtures.py          # write tests/fixtures/site_fixtures.json
    python scripts/make_fixtures.py --check  # fail if it is out of date (CI)

For every chapter (src/data/chapter_configs.json): every MCP session it animates (wire
messages, annotated log, sequence-chart frames, negotiation, framing on stdio and Streamable
HTTP), and the chapter's other views (the tool-call journey, the three ways, the integration
counts, every broken-stream run, the OAuth variants and attacks as step charts, the gateway
under each policy, every A2A session). tests/unit/frames.test.ts recomputes them with the vendored
TS port and requires equality; tests/e2e/frames.spec.ts checks the captions on the page.

The engine must be installed from git at the commit in src/lib/engine/vendor/VENDORED.json
(reference/requirements.txt pins it); this script refuses to run otherwise.
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import sys
from pathlib import Path

from agent_loop_sim.protocols import a2a, gateway, mcp, oauth, scenarios, security, transport, views
from agent_loop_sim.tokenizer import default_tokenizer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests/fixtures/site_fixtures.json"


def installed_commit() -> str:
    d = importlib.metadata.distribution("agent-loop-sim")
    info = json.loads(d.read_text("direct_url.json") or "{}")
    return info.get("vcs_info", {}).get("commit_id", "")


def session(name: str) -> dict:
    sc = scenarios.protocol_scenario(name)
    p = mcp.play(sc)
    return {
        "name": name,
        "title": sc["title"],
        "mode": sc["mode"],
        "wire": p["wire"],
        "log": p["log"],
        "sequence": views.sequence_frames(p),
        "negotiation": views.negotiation(p),
        "stdio": transport.frame_session(p["log"], p["wire"], "stdio"),
        "http": None if sc["mode"] == "raw" else transport.frame_session(p["log"], p["wire"], "http"),
    }


def flow(run: dict) -> dict:
    return dict(run, frames=views.flow_frames(run))


def a2a_session(name: str) -> dict:
    sc = a2a.a2a_scenario(name)
    p = a2a.play(sc)
    return {"name": name, "title": sc["title"], "wire": p["wire"], "log": p["log"], "card": p["card"],
            "frames": views.a2a_frames(p), "summary": views.a2a_summary(p)}


def build() -> str:
    vendored = json.loads((ROOT / "src/lib/engine/vendor/VENDORED.json").read_text())
    commit = installed_commit()
    if commit != vendored["commit"]:
        sys.exit(f"installed agent-loop-sim is at {commit[:7] or '?'}, the site vendors {vendored['commit'][:7]}: "
                 "pip install -r reference/requirements.txt")
    configs = json.loads((ROOT / "src/data/chapter_configs.json").read_text())
    tok = default_tokenizer()
    out: dict = {"commit": commit, "chapters": {}}
    for chapter, cfg in configs.items():
        ch: dict = {"sessions": {n: session(n) for n in cfg["scenarios"]}}
        if chapter == "why":
            ch["journeys"] = {n: views.journey(mcp.play(scenarios.protocol_scenario(n))) for n in cfg["scenarios"]}
            ch["integration"] = [views.integration_frames(n, m) for n, m in cfg["integration"]]
        if cfg.get("tokens"):
            ch["threeWays"] = {n: views.three_ways(mcp.play(scenarios.protocol_scenario(n)), tok) for n in cfg["scenarios"]}
        if "drops" in cfg:
            ch["drops"] = {}
            for era in ["handshake", "modern"]:
                for n in cfg["drops"]["n"]:
                    for k in range(1, n):
                        ch["drops"][f"{era}-{n}-{k}"] = transport.stream_drop(era, n, k)
        if "oauth" in cfg:
            ch["flows"] = {v: flow(oauth.run_oauth(v)) for v in cfg["oauth"]}
        if "attacks" in cfg:
            ch["flows"] = {f"{a}-{'defended' if d else 'open'}": flow(security.run_security(a, d))
                           for a in cfg["attacks"] for d in [False, True]}
        if "gateway" in cfg:
            ch["gateways"] = {p: gateway.gateway_run(p, tok) for p in cfg["gateway"]}
        if "a2a" in cfg:
            ch["a2a"] = {n: a2a_session(n) for n in cfg["a2a"]}
            ch["taskStates"] = {"states": a2a.STATES, "transitions": a2a.TRANSITIONS}
        out["chapters"][chapter] = ch
    return json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    text = build()
    if a.check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            sys.exit("tests/fixtures/site_fixtures.json is out of date (run python scripts/make_fixtures.py)")
        print("site fixtures up to date")
    else:
        OUT.write_text(text, encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
