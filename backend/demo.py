# -*- coding: utf-8 -*-
import sys, io
# Force UTF-8 output on Windows terminals that default to cp1252
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

"""
PathSense backend end-to-end demo.

Calls POST /api/routes then POST /api/friction against a running server and
prints color-coded friction scores per segment in the terminal.
Also demonstrates POST /api/reroute for detour suggestions.

Prerequisites
-------------
  1. Fill in backend/.env  (GOOGLE_MAPS_API_KEY, GEMINI_API_KEY, model names)
  2. Start the server:   uvicorn main:app --reload

Usage
-----
  # Default (short UCLA campus route ~0.3 km, ~5 steps, walking only)
  python demo.py

  # --- Mode selection (new) ---
  python demo.py --mode walking   # walking routes only (fastest, default)
      # transit routes only (bus/metro)
  python demo.py --mode all       # walking + transit side-by-side

  # --- SHORT routes (< 1 km, ~5-10 segments, fast) ---
  python demo.py --origin "Ackerman Union, UCLA" --dest "Powell Library, UCLA" --profile wheelchair
  python demo.py --origin "Ackerman Union, UCLA" --dest "Powell Library, UCLA" --profile stroller
  python demo.py --origin "Ackerman Union, UCLA" --dest "Powell Library, UCLA" --profile low-vision

  # --- MEDIUM routes (1-2 km, ~15-20 segments, ~20s) ---
  python demo.py --origin "Union Station, Los Angeles" --dest "Grand Park, Los Angeles" --profile wheelchair
  python demo.py --origin "Pershing Square, Los Angeles" --dest "The Broad, Los Angeles" --profile stroller
  python demo.py --origin "Union Station, Los Angeles" --dest "City Hall, Los Angeles" --profile low-vision
  python demo.py --origin "Little Tokyo, Los Angeles" --dest "Grand Central Market, Los Angeles" --profile wheelchair

  # --- LONG routes (2-5 km, ~30-50 segments, ~45s) ---
  python demo.py --origin "Union Station, Los Angeles" --dest "Griffith Observatory, Los Angeles" --profile wheelchair
  python demo.py --origin "Santa Monica Pier" --dest "Venice Beach Boardwalk" --profile stroller
  python demo.py --origin "Dodger Stadium, Los Angeles" --dest "Echo Park, Los Angeles" --profile wheelchair
  python demo.py --origin "Koreatown, Los Angeles" --dest "MacArthur Park, Los Angeles" --profile low-vision

  # --- VERY LONG routes (5+ km, ~60-80 segments, ~90s) ---
  python demo.py --origin "LAX International Airport" --dest "Venice Beach, Los Angeles" --profile wheelchair
  python demo.py --origin "Pasadena City Hall" --dest "Union Station, Los Angeles" --profile stroller
  python demo.py --origin "Hollywood Walk of Fame" --dest "Griffith Observatory, Los Angeles" --profile low-vision
  python demo.py --origin "Santa Monica Pier" --dest "Getty Center, Los Angeles" --profile wheelchair

  # --- TRANSIT-ONLY demos (bus/metro with accessibility scoring) ---
  python demo.py --origin "Union Station, Los Angeles" --dest "Santa Monica Pier" --profile wheelchair --mode transit
  python demo.py --origin "Hollywood/Highland Station" --dest "Union Station, Los Angeles" --profile low-vision --mode transit
  python demo.py --origin "Culver City Station" --dest "7th St/Metro Center Station" --profile wheelchair --mode transit

  # --- ALL MODES (walking + transit comparison) ---
  python demo.py --origin "Union Station, Los Angeles" --dest "The Broad, Los Angeles" --profile wheelchair --mode all
  python demo.py --origin "Koreatown, Los Angeles" --dest "Downtown LA" --profile stroller --mode all
  python demo.py --origin "Venice Beach, Los Angeles" --dest "Santa Monica Pier" --profile low-vision --mode all

  # --- DETOUR demo (reroute around HIGH-friction segment) ---
  python demo.py --origin "Ackerman Union, UCLA" --dest "Powell Library, UCLA" --profile wheelchair --reroute
  python demo.py --origin "Union Station, Los Angeles" --dest "City Hall, Los Angeles" --profile wheelchair --reroute
"""
import argparse
import json
import sys
import time
import httpx

# ── ANSI colours ──────────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
WHITE  = "\033[97m"

LEVEL_COLOR = {"LOW": GREEN, "MEDIUM": YELLOW, "HIGH": RED}

def color(text: str, *codes: str) -> str:
    return "".join(codes) + str(text) + RESET

def hr(char: str = "-", width: int = 60) -> str:
    return color(char * width, DIM)

def friction_bar(score: float, width: int = 20) -> str:
    filled = round(score * width)
    c = GREEN if score < 0.35 else (YELLOW if score < 0.65 else RED)
    return color("█" * filled, c) + color("░" * (width - filled), DIM)

# ── Main demo ─────────────────────────────────────────────────────────────────

BASE_URL = "http://localhost:8000"

def wait_for_server(timeout: int = 5) -> bool:
    for _ in range(timeout):
        try:
            httpx.get(f"{BASE_URL}/api/health", timeout=1)
            return True
        except Exception:
            time.sleep(1)
    return False


MODE_COLOR = {"walking": CYAN, "transit": YELLOW}
SEG_TYPE_BADGE = {"walk": color("[walk]", DIM), "transit": color("[bus ]", CYAN), "transfer": color("[xfer]", DIM)}


def _route_header(route: dict) -> str:
    mode_badge = color(f"[{route.get('mode', 'walking')[:7]}]", MODE_COLOR.get(route.get("mode", "walking"), WHITE))
    return f"  {mode_badge} {color(route['label'].upper(), BOLD, WHITE)}"


def run_demo(origin: str, destination: str, profile: str, mode: str = "walking", show_reroute: bool = False) -> None:
    print()
    print(color("  PathSense — backend demo  ", BOLD, CYAN))
    print(hr())
    print(f"  {color('Origin', BOLD)}      {origin}")
    print(f"  {color('Destination', BOLD)} {destination}")
    print(f"  {color('Profile', BOLD)}     {profile}")
    print(f"  {color('Mode', BOLD)}        {mode}")
    print(hr())

    # ── Check server ──────────────────────────────────────────────────────────
    print(f"\n{color('> Checking server at ' + BASE_URL, BOLD)} ...", end=" ", flush=True)
    if not wait_for_server():
        print(color("x server not responding", RED))
        print(color("  Start it first:  uvicorn main:app --reload", DIM))
        sys.exit(1)
    print(color("ok online", GREEN))

    client = httpx.Client(base_url=BASE_URL, timeout=60)

    # ── Stage 1: Routes ───────────────────────────────────────────────────────
    print(f"\n{color('> POST /api/routes', BOLD)} (mode={mode}) ...", end=" ", flush=True)
    t0 = time.perf_counter()
    try:
        resp = client.post("/api/routes", json={
            "origin": origin,
            "destination": destination,
            "profile": profile,
            "mode": mode,
        })
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        print(color(f"x {e.response.status_code} — {e.response.text[:200]}", RED))
        sys.exit(1)
    except Exception as e:
        print(color(f"x {e}", RED))
        sys.exit(1)

    elapsed = time.perf_counter() - t0
    routes = resp.json()["routes"]
    print(color(f"ok {len(routes)} route(s)  [{elapsed:.2f}s]", GREEN))

    # Print route summaries
    for route in routes:
        mins = round(route["durationSeconds"] / 60)
        km   = route["distanceMeters"] / 1000
        n    = len(route["segments"])
        mode_tag = color(f"[{route.get('mode','walk')[:7]}]", MODE_COLOR.get(route.get("mode","walking"), WHITE))
        print(
            f"   {mode_tag} {color(route['label'].upper(), BOLD, WHITE):<22}"
            f"  {mins} min  {km:.1f} km  {n} steps"
        )

    # ── Stage 2: Friction ─────────────────────────────────────────────────────
    print(f"\n{color('> POST /api/friction', BOLD)} ...", end=" ", flush=True)

    # Collect all segments from all routes (include segmentType + transitInfo)
    all_segments = []
    for route in routes:
        for seg in route["segments"]:
            s = {
                "id":            seg["id"],
                "description":   seg["description"],
                "distanceMeters": seg["distanceMeters"],
                "segmentType":   seg.get("segmentType", "walk"),
                "startLat":      seg["startLat"],
                "startLng":      seg["startLng"],
                "endLat":        seg["endLat"],
                "endLng":        seg["endLng"],
            }
            if seg.get("transitInfo"):
                s["transitInfo"] = seg["transitInfo"]
            all_segments.append(s)

    t0 = time.perf_counter()
    try:
        resp = client.post("/api/friction", json={
            "segments":     all_segments,
            "profile":      profile,
            "languageCode": "en",
        })
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        print(color(f"x HTTP {e.response.status_code}", RED))
        try:
            detail = e.response.json().get("detail", e.response.text)
            if isinstance(detail, dict):
                print(color(f"  {detail.get('message', '')}", RED))
                for err in detail.get("errors", [])[:3]:
                    print(color(f"  -> {err[:200]}", DIM))
            else:
                print(color(f"  {str(detail)[:300]}", DIM))
        except Exception:
            print(color(f"  {e.response.text[:300]}", DIM))
        print(color("\n  Tip: check GEMINI_API_KEY and GEMINI_SCORING_MODEL in backend/.env", YELLOW))
        sys.exit(1)
    except Exception as e:
        print(color(f"x {e}", RED))
        sys.exit(1)

    elapsed = time.perf_counter() - t0
    scores  = resp.json()["scores"]
    level   = GREEN if scores else YELLOW
    print(color(f"ok {len(scores)} segment(s) scored  [{elapsed:.2f}s]", level))

    # ── Print per-route results ───────────────────────────────────────────────
    first_high_seg: dict | None = None   # for reroute demo

    for route in routes:
        print()
        print(hr("="))
        print(_route_header(route), end="  ")
        mins = round(route["durationSeconds"] / 60)
        print(color(f"{mins} min  {route['distanceMeters']/1000:.1f} km", DIM))
        print(hr("="))

        for seg in route["segments"]:
            sc = scores.get(seg["id"])
            seg_badge = SEG_TYPE_BADGE.get(seg.get("segmentType", "walk"), color("[walk]", DIM))

            if sc is None:
                print(f"  {seg_badge} {color('?', DIM)}  {seg['description'][:50]}")
                continue

            lvl    = sc["level"]
            fscore = sc["frictionScore"]
            conf   = sc["confidence"]
            lc     = LEVEL_COLOR[lvl]

            print(
                f"  {seg_badge} {color(f'[{lvl:<6}]', lc, BOLD)}"
                f" {friction_bar(fscore)}"
                f" {color(f'{fscore:.2f}', lc)}"
                f" {color(f'(conf {conf:.0%})', DIM)}"
            )
            desc = seg["description"]
            if len(desc) > 60:
                desc = desc[:57] + "..."
            print(f"    {color(desc, DIM)}")

            if seg.get("transitInfo"):
                ti = seg["transitInfo"]
                vtype = ti.get("vehicleType", "")
                accessible = ti.get("wheelchairAccessible")
                acc_str = (color("accessible", GREEN) if accessible else
                           color("accessibility unknown", YELLOW) if accessible is None else
                           color("NOT accessible", RED))
                print(f"    {color(ti.get('routeName',''), BOLD)} {vtype}  {acc_str}")

            if lvl in ("HIGH", "MEDIUM") and sc.get("reasons"):
                print(f"    {color('!', YELLOW)} {sc['reasons'][0]}")
            if lvl == "HIGH" and sc.get("recommendation"):
                print(f"    {color('->', CYAN)} {sc['recommendation']}")

            # Track first HIGH walk seg for reroute demo
            if (lvl == "HIGH" and seg.get("segmentType", "walk") == "walk"
                    and first_high_seg is None and seg.get("startLat")):
                first_high_seg = seg

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print(hr())
    high_count   = sum(1 for s in scores.values() if s["level"] == "HIGH")
    medium_count = sum(1 for s in scores.values() if s["level"] == "MEDIUM")
    low_count    = sum(1 for s in scores.values() if s["level"] == "LOW")
    print(
        f"  Friction summary: "
        f"{color(f'{low_count} LOW', GREEN)}  "
        f"{color(f'{medium_count} MEDIUM', YELLOW)}  "
        f"{color(f'{high_count} HIGH', RED)}"
    )
    print(hr())

    # ── Stage 3 (optional): Reroute around first HIGH segment ─────────────────
    if show_reroute and first_high_seg:
        print(f"\n{color('> POST /api/reroute', BOLD)} (detour around {first_high_seg['id']}) ...", end=" ", flush=True)
        t0 = time.perf_counter()
        try:
            resp = client.post("/api/reroute", json={
                "segmentId": first_high_seg["id"],
                "startLat":  first_high_seg["startLat"],
                "startLng":  first_high_seg["startLng"],
                "endLat":    first_high_seg["endLat"],
                "endLng":    first_high_seg["endLng"],
                "profile":   profile,
            })
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(color(f"x {e.response.status_code} — {e.response.text[:200]}", RED))
        except Exception as e:
            print(color(f"x {e}", RED))
        else:
            elapsed = time.perf_counter() - t0
            body = resp.json()
            n_segs = len(body["replacementSegments"])
            km = body["totalDistanceMeters"] / 1000
            mins = round(body["durationSeconds"] / 60)
            print(color(f"ok {n_segs} replacement step(s)  {mins} min  {km:.1f} km  [{elapsed:.2f}s]", GREEN))
            print(hr())
            for seg in body["replacementSegments"]:
                desc = seg["description"]
                if len(desc) > 65:
                    desc = desc[:62] + "..."
                print(f"  {color('[detour]', CYAN)} {desc}")
            print(hr())
    elif show_reroute and not first_high_seg:
        print(color("\n  (no HIGH walk segments found — reroute not triggered)", DIM))

    print()


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PathSense backend demo")
    parser.add_argument(
        "--origin",   default="Ackerman Union, UCLA",
        help="Starting address"
    )
    parser.add_argument(
        "--dest",     default="Powell Library, UCLA",
        help="Destination address"
    )
    parser.add_argument(
        "--profile",  default="wheelchair",
        choices=["wheelchair", "low-vision", "stroller"],
        help="Accessibility profile"
    )
    parser.add_argument(
        "--mode",     default="walking",
        choices=["walking", "transit", "all"],
        help="Route mode: walking, transit, or all (walking + transit side-by-side)"
    )
    parser.add_argument(
        "--reroute",  action="store_true",
        help="After scoring, call POST /api/reroute on the first HIGH-friction walk segment"
    )
    args = parser.parse_args()
    run_demo(args.origin, args.dest, args.profile, mode=args.mode, show_reroute=args.reroute)
