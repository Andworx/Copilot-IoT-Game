# iotdisplay — kiosk display Pi

Boots straight into the [`copilotiotgame`](../../power%20pages/copilotiotgame/)
kiosk Power Page with no keyboard, mouse, login, or manual command. This is
the **iotdisplay** Pi: it only drives the touchscreen. It does **not** read
switches or drive LEDs — that's the
[panel Pi](../raspberry-pi/) (`hardware/raspberry-pi/`), a separate device
with its own setup. The two Pis start independently; iotdisplay reaches the
kiosk page cleanly even if the panel Pi is off or slow to boot.

## How it boots

- `systemd/iotdisplay-kiosk.service` owns `tty1`/seat0 directly (no display
  manager) and runs [`cage`](https://github.com/cage-kiosk/cage), a minimal
  Wayland compositor whose only job is to run one app full-screen. Its one
  client is `kiosk-browser.sh`.
- `kiosk-browser.sh` shows a local `waiting.html` page immediately, then
  loops (with backoff) until the network is up, the clock is synced, and
  `KIOSK_URL` (from `.env`) actually responds — then `exec`s Chromium at the
  real URL so it becomes `cage`'s direct child.
- `Restart=always` on the unit means **any** exit — a crashed tab, a killed
  process, cage itself dying — re-enters the whole wait-and-reload cycle from
  the top. `kiosk-watchdog.sh`, run every 30s by
  `iotdisplay-kiosk-watchdog.timer`, kills Chromium if its DevTools endpoint
  (`--remote-debugging-port`) stops answering, which is what turns a hung
  (not crashed) tab into a restart too.
- Chromium runs with a **dedicated, persistent profile**
  (`~/.config/kiosk-chromium`, not `--incognito`/`--guest`) plus flags that
  suppress every prompt this project has hit: the crash-restore bubble
  (`--disable-session-crashed-bubble`, and `kiosk-browser.sh` also clears the
  profile's `exit_type` before every launch), first-run/default-browser
  checks, translate, and update checks.

## Why `KIOSK_URL` is the site root, not `/kiosk/info`

`copilotiotgame` is a client-side-routed SPA (react-router `BrowserRouter`),
but Power Pages has no wildcard/catch-all page for this Code Site — a direct
hit to `/kiosk/*` 404s at the platform level (as an HTTP 200 with Power
Pages' own "Page Not Found" content) before the SPA's own router ever gets a
chance to run. Only the root path (`/`) is a registered Power Pages page, so
that's what `KIOSK_URL` points at; the app's own router then takes over
client-side and lands on `/kiosk/info`. If `/kiosk/*` gains real server-side
routing later (e.g. a wildcard page, or the app switching to `HashRouter`),
`KIOSK_URL` can point directly at the deep link again.

## Setup

```bash
cd hardware/iotdisplay
cp .env.example .env   # fill in KIOSK_URL if it differs from the default
./setup-iotdisplay.sh
```

`setup-iotdisplay.sh` is idempotent — installs `cage`, enables
`systemd-time-wait-sync.service` (see "Why the time-sync line matters" in the
panel Pi's [Run on boot](../raspberry-pi/README.md#run-on-boot) section — the
same no-battery-clock issue applies here), installs the systemd units,
and **disables `lightdm`** so the kiosk unit can own `tty1`/seat0 directly —
this replaces the Pi's existing full-desktop autologin, not adds to it. See
"Recovering a blank or stuck screen" below to roll that back.

Adjust `WorkingDirectory`/`ExecStart` in
`systemd/iotdisplay-kiosk.service` if this repo isn't cloned to
`/home/pi/restore-and-spin`.

### One-time sign-in bootstrap

The root page requires Entra ID sign-in (Power Pages redirects `/` to
`login.microsoftonline.com`) and the kiosk profile starts empty, so someone
has to sign in once, interactively, before the kiosk can run unattended:

1. Before (or instead of) running `setup-iotdisplay.sh`, or after rolling
   back per "Recovering a blank or stuck screen" below, get a hands-on
   session on the Pi (attached keyboard/mouse, or VNC into the still-running
   desktop).
2. Launch Chromium with the **same profile** the kiosk will use, explicitly
   on Wayland (see "Confirmed on real hardware" in `kiosk-browser.sh` —
   Chromium's Ozone auto-detect picks X11 and fails otherwise):
   `chromium --ozone-platform=wayland --user-data-dir="$HOME/.config/kiosk-chromium" "$KIOSK_URL"`.
3. Sign in through the Entra ID prompt. Close Chromium normally once the
   kiosk page loads.
4. Run (or re-run) `setup-iotdisplay.sh`. The kiosk now reuses that same
   profile, so the signed-in session carries across reboots (until the
   underlying token expires — there's no automatic re-auth yet; a stuck
   login prompt is one of the first things to check under "Recovering a
   blank or stuck screen").

## Recovering a blank or stuck screen

```bash
ssh pi@iotdisplay
sudo systemctl status iotdisplay-kiosk.service
journalctl -u iotdisplay-kiosk.service -f      # tail kiosk-browser.sh logs
journalctl -u iotdisplay-kiosk-watchdog.service -f
curl http://127.0.0.1:9222/json/version         # confirm Chromium is alive
curl -s http://127.0.0.1:9222/json/list | grep -o '"url":"[^"]*"'  # what's on screen -- a login.microsoftonline.com URL means the saved session expired
sudo systemctl restart iotdisplay-kiosk.service # force a fresh wait-and-reload cycle
```

If the kiosk is stuck on a `login.microsoftonline.com` URL, the saved
session expired — redo the "One-time sign-in bootstrap" above.

To get a hands-on desktop back (for debugging, or to redo the sign-in
bootstrap above), roll back to the previous autologin:

```bash
sudo systemctl disable --now iotdisplay-kiosk.service
sudo systemctl enable --now lightdm
```

Re-run `setup-iotdisplay.sh` afterwards to return to kiosk mode.

## Files

| File | Purpose |
|---|---|
| `setup-iotdisplay.sh` | One idempotent bootstrap script — see "Setup" |
| `kiosk-browser.sh` | Waits for network/time/page, then execs Chromium — `cage`'s client |
| `kiosk-watchdog.sh` | Health check run by the `.timer`; kills a hung Chromium |
| `waiting.html` | Local, offline-safe page shown until the real kiosk URL is ready |
| `systemd/iotdisplay-kiosk.service` | Owns tty1/seat0, runs `cage -- kiosk-browser.sh`, `Restart=always` |
| `systemd/iotdisplay-kiosk-watchdog.{service,timer}` | Runs `kiosk-watchdog.sh` every 30s |
| `.env.example` | Copy to `.env` (gitignored) — sets `KIOSK_URL` |

## Testing checklist

Run each of these over SSH and confirm the kiosk recovers with no manual
step:

- Fresh install: `./setup-iotdisplay.sh`, then `systemctl status
  iotdisplay-kiosk.service` is active and `curl
  http://127.0.0.1:9222/json/list` shows `$KIOSK_URL` loaded.
- Cold boot: `sudo reboot`, reconnect once it's back, confirm the kiosk
  reached the page unattended.
- Network drop: `nmcli radio wifi off`, confirm (via the CDP endpoint) the
  waiting page is showing; `nmcli radio wifi on` and confirm it recovers on
  its own.
- `pkill chromium` and separately `pkill cage`: confirm the kiosk comes back
  both times without intervention.
- Panel Pi off: confirm iotdisplay still reaches the kiosk page (this unit
  has no dependency on `restore-and-spin-panel.service`).
