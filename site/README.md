# Dulinan Space — Home Screen

Static home screen for **dulinan.space** (Bahasa Indonesia, target usia 3–5).
Plain HTML/CSS/JS, no build step — recreated from the high-fidelity design
handoff (`Dulinan Space.dc.html` / README) with exact colors, typography,
spacing, and interactions.

## Files
- `index.html` — markup (home grid + loading/play overlay)
- `style.css` — design tokens, layout, animations (`floaty`, `twinkle`, `pop`, `orbit`, `bob`)
- `script.js` — game data, card rendering, loading-simulation state machine

## Preview locally
Any static file server works, e.g.:

```sh
npx serve .
# or
python -m http.server 8080
```

Then open the printed URL in a browser (best viewed narrow / mobile width).

## Deploying to dulinan.space
This folder is a plain static site — no build step. Point any static host
(GitHub Pages from this folder, Vercel, Netlify, Cloudflare Pages) at `site/`
and attach the `dulinan.space` domain in that host's DNS/domain settings.

## Notes / next steps
- Icons are emoji placeholders (per design spec) — swap for illustrated art
  in `script.js`'s `GAMES` array + `.game-icon` styling when assets exist.
- The mascot is built from CSS shapes — replace with real mascot art later.
- "Main Sekarang" is currently a no-op placeholder (see `script.js`) — wire
  it up to actually launch a game (e.g. the Godot web export in `../games`)
  once game routing exists.
- The fake loading timer in `script.js` (`startGame`) should be replaced
  with real asset-loading progress once games are wired in.
