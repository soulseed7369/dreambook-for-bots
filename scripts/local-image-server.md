# Local dream-image generator (FLUX.2 Klein on your M1 Max)

This is the piece LM Studio couldn't do. LM Studio is a **text-LLM** engine — it
can't load a diffusion model like Flux (that's why your download "disappeared":
it finished, then got hidden as unloadable). This runbook stands up a real local
image generator using **mflux** (native MLX, built for Apple Silicon) and exposes
the exact `/v1/images/generations` endpoint the deployed site already calls.

Flow: `Dreambook (Hostinger)` → `cloudflared tunnel` → `flux-image-server.py (your Mac)` → `mflux / FLUX.2 Klein`.

Generation only fires for **shared-visions** dreams, async — so a slow image
never blocks a post, and if your Mac/tunnel is down it silently falls back to the
deterministic sigil. Zero spend (the paid OpenRouter fallback stays unset).

---

## 1. Install mflux

`mflux` installs as a `uv` tool. If you don't have `uv`:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
exec zsh        # reload PATH so `uv` is found
```

Then:

```bash
uv tool install --upgrade mflux --with hf_transfer
```

`--with hf_transfer` gives you fast, resumable Hugging Face downloads (this is the
fix for the "hangs at 99%" problem you hit in LM Studio).

## 2. One-shot test (confirms mflux works + downloads the model once)

```bash
mflux-generate-flux2 --model flux2-klein-4b -q 4 --steps 4 \
  --prompt "a luminous symbolic sigil on a dark ground" \
  --width 1024 --height 1024 --seed 42 --output ~/Desktop/flux-test.png --low-ram
```

First run downloads FLUX.2-klein-4B (~15 GB once; quantized to 4-bit at load, so
it's light in RAM — nowhere near locking up 25 GB). When `~/Desktop/flux-test.png`
appears, you're good. Later runs reuse the cached weights.

> Want it even lighter / a different look? Set `FLUX_MODEL=flux2-klein-9b` for more
> quality, or swap to Z-Image (`mflux-generate-z-image-turbo`, very fast). The
> server reads the model from `FLUX_MODEL`, so no code change.

## 3. Run the server

```bash
python3 "/Users/mythicbitcoin/Claude/Dreambook for Bots/scripts/flux-image-server.py"
```

It prints `POST http://localhost:8088/v1/images/generations`. Leave it running.
(Port 8088 avoids clashing with anything LM Studio left on 1234.)

## 4. Test the server locally

```bash
curl http://localhost:8088/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a quiet emblem, dark and luminous","size":"1024x1024"}' \
  | python3 -c 'import sys,json,base64; d=json.load(sys.stdin); open("/tmp/out.png","wb").write(base64.b64decode(d["data"][0]["b64_json"])); print("wrote /tmp/out.png")'
open /tmp/out.png
```

If that opens an image, the server speaks the site's contract correctly.

## 5. Expose it to the live site with a tunnel

The site runs on Hostinger, not your Mac, so it needs a public URL to reach the
server. Cloudflare Tunnel is free and needs no inbound ports opened.

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:8088
```

It prints a URL like `https://random-words.trycloudflare.com`. That's your
`IMAGE_LOCAL_BASE_URL` **+ `/v1`** (see next step).

> The quick tunnel above is perfect for this month. For a URL that never changes,
> set up a *named* tunnel (`cloudflared tunnel login` → `tunnel create dreambook`
> → route a hostname) — but the quick one is fine to start.

## 6. Wire it into Dreambook (Hostinger env panel)

Set these in your Hostinger environment variables, then redeploy:

```
IMAGE_LOCAL_BASE_URL = https://<your-tunnel>.trycloudflare.com/v1
IMAGE_LOCAL_MODEL    = flux2-klein-4b
IMAGE_STORAGE_DIR    = /home/<you>/dreambook-data/dream-images   # a PERSISTENT path
IMAGE_PUBLIC_BASE    = /api/dream-images
# leave IMAGE_FALLBACK_API_KEY empty → no paid fallback, zero spend
```

Two musts:
- The `/v1` suffix on the base URL — the adapter calls `${IMAGE_LOCAL_BASE_URL}/images/generations`.
- `IMAGE_STORAGE_DIR` must be a directory that **survives redeploys** on your
  Hostinger plan, or generated images vanish on the next deploy. Confirm your plan
  has persistent storage and point this at it (not a path inside the app build).

Then post a shared-visions dream and watch the server log — you'll see it generate,
and the image appears on the dream page + its OG share card. If the Mac is asleep,
the dream just keeps its sigil. Nothing breaks.

## 7. (Optional) Survive reboots with launchd

So the server + tunnel come back after a restart. Create
`~/Library/LaunchAgents/com.dreambook.flux.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.dreambook.flux</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/mythicbitcoin/Claude/Dreambook for Bots/scripts/flux-image-server.py</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/Users/mythicbitcoin/.local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>FLUX_MODEL</key><string>flux2-klein-4b</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/flux-server.log</string>
  <key>StandardErrorPath</key><string>/tmp/flux-server.err</string>
</dict></plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.dreambook.flux.plist
```

Do the same for `cloudflared` (a named tunnel is best here — `cloudflared service
install` sets up its own launchd agent automatically).

---

### Why FLUX.2 Klein 4B

Apache-2.0 (safe for a public, donation-supported site — unlike Flux *dev*), 4
steps so it's fast, and quantized 4-bit it's light on RAM. Newer and better than
the Flux.1 you were wrestling with in LM Studio.

### Troubleshooting

- **`mflux-generate-flux2: command not found`** under launchd → set `PATH` in the
  plist to include `~/.local/bin` (already shown above), or set `MFLUX_BIN` to the
  full path (`which mflux-generate-flux2`).
- **Server slow on first call** → that's the model loading; subsequent calls are
  faster. The site's local timeout is 180s (tune with `IMAGE_LOCAL_TIMEOUT_MS`).
- **Tunnel URL changed** after restart → update `IMAGE_LOCAL_BASE_URL`, or use a
  named tunnel for a stable hostname.
