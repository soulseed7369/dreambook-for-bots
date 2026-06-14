#!/usr/bin/env python3
"""
flux-image-server.py — a tiny local image-generation server for Dreambook.

Wraps the `mflux-generate-flux2` CLI (FLUX.2 Klein on MLX, runs natively on
Apple Silicon) and exposes an OpenAI-compatible endpoint:

    POST /v1/images/generations
    { "prompt": "...", "size": "1024x1024", "seed": 123 }
    -> { "created": <ts>, "data": [ { "b64_json": "<base64 png>" } ] }

This is exactly the shape the deployed site's adapter (src/lib/dream-image.ts,
IMAGE_LOCAL_BASE_URL) already calls — so no code change on the site is needed.

Stdlib only. No pip installs beyond mflux itself.

Run:
    mflux-image-server   # see scripts/local-image-server.md for setup
    # or:
    python3 scripts/flux-image-server.py

Config via environment variables (all optional):
    PORT                 Port to listen on              (default 8088)
    FLUX_MODEL           mflux model name               (default flux2-klein-4b)
    FLUX_QUANTIZE        on-the-fly quantization 3-8    (default 4)
    FLUX_STEPS           inference steps                (default 4)
    FLUX_WIDTH           default width if size absent   (default 1024)
    FLUX_HEIGHT          default height if size absent  (default 1024)
    FLUX_LOW_RAM         "1" adds --low-ram             (default 1)
    FLUX_CACHE_LIMIT_GB  caps MLX cache (e.g. "3")      (default unset)
    MFLUX_BIN            path/name of the CLI           (default mflux-generate-flux2)
    GEN_TIMEOUT_S        per-request subprocess timeout (default 600)
    SERVER_API_KEY       if set, require Bearer match   (default unset = open)
"""

import base64
import glob
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ─── Config ──────────────────────────────────────────────────────────────────
PORT = int(os.environ.get("PORT", "8088"))
FLUX_MODEL = os.environ.get("FLUX_MODEL", "flux2-klein-4b")
FLUX_QUANTIZE = os.environ.get("FLUX_QUANTIZE", "4")
FLUX_STEPS = os.environ.get("FLUX_STEPS", "4")
DEF_WIDTH = int(os.environ.get("FLUX_WIDTH", "1024"))
DEF_HEIGHT = int(os.environ.get("FLUX_HEIGHT", "1024"))
LOW_RAM = os.environ.get("FLUX_LOW_RAM", "1") == "1"
CACHE_LIMIT_GB = os.environ.get("FLUX_CACHE_LIMIT_GB", "").strip()
MFLUX_BIN = os.environ.get("MFLUX_BIN", "mflux-generate-flux2")
GEN_TIMEOUT_S = int(os.environ.get("GEN_TIMEOUT_S", "600"))
SERVER_API_KEY = os.environ.get("SERVER_API_KEY", "").strip()

# MLX on a single Mac: serialize generations so concurrent requests don't thrash.
_gen_lock = threading.Lock()


def _resolve_bin() -> str:
    """Find the mflux CLI. uv installs tools to ~/.local/bin, which may not be on
    PATH under launchd — so check a few likely spots."""
    if os.path.isabs(MFLUX_BIN) and os.path.exists(MFLUX_BIN):
        return MFLUX_BIN
    found = shutil.which(MFLUX_BIN)
    if found:
        return found
    home = os.path.expanduser("~")
    for cand in (
        os.path.join(home, ".local", "bin", MFLUX_BIN),
        os.path.join(home, ".cargo", "bin", MFLUX_BIN),
        f"/opt/homebrew/bin/{MFLUX_BIN}",
    ):
        if os.path.exists(cand):
            return cand
    return MFLUX_BIN  # let it fail loudly with a clear error


def _parse_size(size, default_w, default_h):
    if isinstance(size, str) and "x" in size.lower():
        try:
            w, h = size.lower().split("x", 1)
            return int(w), int(h)
        except ValueError:
            pass
    return default_w, default_h


def generate_png_bytes(prompt: str, width: int, height: int, seed: int) -> bytes:
    """Run mflux once and return the PNG bytes. Raises on failure."""
    binpath = _resolve_bin()
    tmpdir = tempfile.mkdtemp(prefix="flux-")
    out = os.path.join(tmpdir, "out.png")
    cmd = [
        binpath,
        "--model", FLUX_MODEL,
        "--quantize", str(FLUX_QUANTIZE),
        "--steps", str(FLUX_STEPS),
        "--seed", str(seed),
        "--width", str(width),
        "--height", str(height),
        "--prompt", prompt,
        "--output", out,
    ]
    if LOW_RAM:
        cmd.append("--low-ram")
    if CACHE_LIMIT_GB:
        cmd += ["--mlx-cache-limit-gb", CACHE_LIMIT_GB]

    print(f"[flux] generating seed={seed} {width}x{height}: {prompt[:80]!r}", flush=True)
    t0 = time.time()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=GEN_TIMEOUT_S,
        )
    finally:
        pass

    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "")[-800:]
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise RuntimeError(f"mflux exited {proc.returncode}: {tail}")

    # Single seed → exact --output path; fall back to a glob just in case.
    path = out
    if not os.path.exists(path):
        matches = glob.glob(os.path.join(tmpdir, "*.png"))
        if not matches:
            shutil.rmtree(tmpdir, ignore_errors=True)
            raise RuntimeError("mflux finished but produced no PNG")
        path = matches[0]

    with open(path, "rb") as fh:
        data = fh.read()
    shutil.rmtree(tmpdir, ignore_errors=True)
    print(f"[flux] done in {time.time() - t0:.1f}s ({len(data)} bytes)", flush=True)
    return data


class Handler(BaseHTTPRequestHandler):
    # Quieter logging
    def log_message(self, fmt, *args):
        sys.stderr.write("[http] " + (fmt % args) + "\n")

    def _send_json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authed(self) -> bool:
        if not SERVER_API_KEY:
            return True
        hdr = self.headers.get("Authorization", "")
        return hdr.startswith("Bearer ") and hdr[7:] == SERVER_API_KEY

    def do_GET(self):
        if self.path.rstrip("/").endswith("/models"):
            self._send_json(200, {
                "object": "list",
                "data": [{"id": FLUX_MODEL, "object": "model", "owned_by": "mflux"}],
            })
            return
        if self.path.rstrip("/") in ("/health", "/healthz"):
            self._send_json(200, {"status": "ok", "model": FLUX_MODEL})
            return
        self._send_json(404, {"error": {"message": "not found"}})

    def do_POST(self):
        if not self.path.rstrip("/").endswith("/images/generations"):
            self._send_json(404, {"error": {"message": "unexpected endpoint"}})
            return
        if not self._authed():
            self._send_json(401, {"error": {"message": "invalid api key"}})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send_json(400, {"error": {"message": "invalid JSON body"}})
            return

        prompt = body.get("prompt")
        if not prompt or not isinstance(prompt, str):
            self._send_json(400, {"error": {"message": "prompt is required"}})
            return

        width, height = _parse_size(body.get("size"), DEF_WIDTH, DEF_HEIGHT)
        seed = body.get("seed")
        if not isinstance(seed, int):
            seed = random.randint(1, 2_000_000_000)

        # Serialize heavy MLX work; one generation at a time on a single Mac.
        with _gen_lock:
            try:
                png = generate_png_bytes(prompt, width, height, seed)
            except subprocess.TimeoutExpired:
                self._send_json(504, {"error": {"message": "generation timed out"}})
                return
            except Exception as exc:  # surface a clear error to the caller
                self._send_json(500, {"error": {"message": str(exc)}})
                return

        b64 = base64.b64encode(png).decode("ascii")
        self._send_json(200, {
            "created": int(time.time()),
            "data": [{"b64_json": b64}],
        })


def main():
    bin_resolved = _resolve_bin()
    print(f"flux-image-server starting on :{PORT}", flush=True)
    print(f"  model   = {FLUX_MODEL} (q{FLUX_QUANTIZE}, {FLUX_STEPS} steps, low_ram={LOW_RAM})", flush=True)
    print(f"  mflux   = {bin_resolved}", flush=True)
    print(f"  auth    = {'on' if SERVER_API_KEY else 'open (no key)'}", flush=True)
    print(f"  POST http://localhost:{PORT}/v1/images/generations", flush=True)
    if not (os.path.isabs(bin_resolved) and os.path.exists(bin_resolved)) and not shutil.which(bin_resolved):
        print(f"  WARNING: '{MFLUX_BIN}' not found on PATH — install mflux first "
              f"(see scripts/local-image-server.md).", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
