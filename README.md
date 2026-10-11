# Shatter

Shatter is a browser-based gravity-well rock shooter. Pilot an inertial ship through a wrapping star field, break armored rocks into fragments, curve gunfire around the central well, and use a guided warhead when a target has to disappear now.

## Run it

```bash
npm ci
npm run dev
```

Open the local address Vite prints. To produce the self-contained static site in `dist/`:

```bash
npm run build
```

## Controls

- Arrow keys or WASD: turn and thrust
- Space: fire
- F: launch the homing torpedo
- Enter / Space: confirm menu selection
- Escape / P: pause or resume
- M: mute
- Backtick: diagnostics overlay

Mouse and touch also operate every menu.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test`.
