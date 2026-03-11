# AGENTS.md

## Cursor Cloud specific instructions

This is a **static front-end** Three.js 3D visualization with zero build dependencies. There is no `package.json`, no bundler, no backend, and no database.

### Running the app

Serve the repo root with any static HTTP server:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in Chrome. The `<script type="module">` and importmap require HTTP (not `file://`).

### Key caveats

- **Three.js is loaded from CDN** (`cdn.jsdelivr.net`). Internet access is required at runtime.
- There is no lint, test, or build step. All logic lives in `main.js`, styling in `style.css`, and markup in `index.html`.
- Configurable constants (`DIMENSIONS`, `COLORS`, `scenes`) are at the top of `main.js`.
