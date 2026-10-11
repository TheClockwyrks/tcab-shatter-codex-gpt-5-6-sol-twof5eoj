import type { Game, InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import type { RockSize } from "./constants";

export type Screen = "title" | "howto" | "playing" | "paused" | "gameover";
export type SaucerEdge = "left" | "right";
export type FieldEdge = "top" | "bottom" | "left" | "right";
export interface ShipState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly angle: number;
  readonly thrusting: boolean;
  readonly invuln: number;
  readonly collision: boolean;
  readonly fireCooldown: number;
}
export interface BulletState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
}
export interface RockState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly size: RockSize;
  readonly spin: number;
  readonly health: number;
  readonly flash: number;
}
export interface SaucerState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly mind: boolean;
  readonly gun: boolean;
  readonly travel: boolean;
  readonly weave: 1 | -1;
  readonly fireClock: number;
  readonly weaveClock: number;
  readonly age: number;
}
export interface TorpedoState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly heading: number;
  readonly life: number;
  readonly homing: boolean;
}
export interface ShatterState {
  readonly screen: Screen;
  readonly menuIndex: number;
  readonly score: number;
  readonly lives: number;
  readonly wave: number;
  readonly waveBanner: number;
  readonly ship: ShipState;
  readonly bullets: readonly BulletState[];
  readonly rocks: readonly RockState[];
  readonly saucer: SaucerState | null;
  readonly enemyBullets: readonly BulletState[];
  readonly torpedoes: readonly TorpedoState[];
  readonly torpedoCharge: number;
  readonly waveSpawning: boolean;
  readonly saucerSpawning: boolean;
  readonly saucerClock: number;
  readonly saucerDue: number;
  readonly nextSaucerEdge: SaucerEdge | null;
  readonly nextSaucerRow: number | null;
  readonly nextSaucerAim: number | null;
  readonly nextRockSpeed: number | null;
  readonly nextRecycleEdge: FieldEdge | null;
  readonly tickClock: number;
  readonly nextId: number;
  readonly simTime: number;
  readonly muted: boolean;
  readonly extraLifeFlash: number;
  readonly menuPress: number | null;
}
export const BACKGROUND = "#050711";
type R = { x: number; y: number; w: number; h: number };
const copy = (s: DeepReadonly<ShatterState>) =>
  structuredClone(s) as ShatterState;
const finite = (...n: number[]) => {
  if (n.some((x) => !Number.isFinite(x)))
    throw new TypeError("expected finite number");
};
const wrap = (x: number, n: number) => ((x % n) + n) % n;
const d1 = (a: number, b: number, n: number) => wrap(b - a + n / 2, n) - n / 2;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(d1(a.x, b.x, C.FIELD_W), d1(a.y, b.y, C.FIELD_H));
const touching = (
  a: { x: number; y: number; vx?: number; vy?: number },
  ra: number,
  b: { x: number; y: number; vx?: number; vy?: number },
  rb: number,
) => {
  const cx = d1(a.x, b.x, C.FIELD_W),
    cy = d1(a.y, b.y, C.FIELD_H),
    px = cx - ((b.vx ?? 0) - (a.vx ?? 0)) * C.TICK_DT,
    py = cy - ((b.vy ?? 0) - (a.vy ?? 0)) * C.TICK_DT,
    sx = cx - px,
    sy = cy - py,
    ll = sx * sx + sy * sy,
    t = ll ? Math.max(0, Math.min(1, -(px * sx + py * sy) / ll)) : 0;
  return Math.hypot(px + sx * t, py + sy * t) <= ra + rb;
};
const adelta = (a: number, b: number) =>
  wrap(b - a + Math.PI, Math.PI * 2) - Math.PI;
const ship = (invuln = 0): ShipState => ({
  x: C.SAFE_X,
  y: C.SAFE_Y,
  vx: 0,
  vy: 0,
  angle: C.FACE_UP,
  thrusting: false,
  invuln,
  collision: true,
  fireCooldown: 0,
});
const base = (): ShatterState => ({
  screen: "title",
  menuIndex: 0,
  score: 0,
  lives: C.START_LIVES,
  wave: 0,
  waveBanner: 0,
  ship: ship(),
  bullets: [],
  rocks: [],
  saucer: null,
  enemyBullets: [],
  torpedoes: [],
  torpedoCharge: 1,
  waveSpawning: true,
  saucerSpawning: true,
  saucerClock: 0,
  saucerDue: C.SAUCER_FIRST_DELAY,
  nextSaucerEdge: null,
  nextSaucerRow: null,
  nextSaucerAim: null,
  nextRockSpeed: null,
  nextRecycleEdge: null,
  tickClock: 0,
  nextId: 1,
  simTime: 0,
  muted: false,
  extraLifeFlash: 0,
  menuPress: null,
});
function rect(s: DeepReadonly<ShatterState>, i: number): R | null {
  const n =
    s.screen === "paused"
      ? 3
      : s.screen === "title" || s.screen === "gameover"
        ? 2
        : 0;
  if (!Number.isInteger(i) || i < 0 || i >= n) return null;
  return {
    x: C.FIELD_W / 2 - 170,
    y: (s.screen === "title" ? 440 : 390) + i * 62,
    w: 340,
    h: 48,
  };
}
function snap(s: DeepReadonly<ShatterState>) {
  return {
    version: C.SHATTER_DEBUG_VERSION,
    screen: s.screen,
    menuIndex: s.menuIndex,
    score: s.score,
    lives: s.lives,
    wave: s.wave,
    waveBanner: s.waveBanner,
    muted: s.muted,
    waveSpawning: s.waveSpawning,
    saucerSpawning: s.saucerSpawning,
    saucerClock: s.saucerClock,
    saucerDue: s.saucerDue,
    nextSaucerEdge: s.nextSaucerEdge,
    nextSaucerRow: s.nextSaucerRow,
    nextSaucerAim: s.nextSaucerAim,
    nextRockSpeed: s.nextRockSpeed,
    nextRecycleEdge: s.nextRecycleEdge,
    ship: { ...s.ship, speed: Math.hypot(s.ship.vx, s.ship.vy) },
    bullets: s.bullets.map((x) => ({ ...x })),
    rocks: s.rocks.map((x) => ({
      id: x.id,
      x: x.x,
      y: x.y,
      vx: x.vx,
      vy: x.vy,
      size: x.size,
      radius: C.ROCK_RADIUS[x.size],
      health: x.health,
    })),
    saucer: s.saucer ? { ...s.saucer } : null,
    enemyBullets: s.enemyBullets.map((x) => ({ ...x })),
    torpedoes: s.torpedoes.map((x) => ({ ...x })),
    torpedoCharge: s.torpedoCharge,
    torpedoReady: s.torpedoCharge === 1,
    simTime: s.simTime,
  };
}
function wave(
  n: number,
  sh: ShipState,
  id: number,
  posed: number | null = null,
) {
  const rocks: RockState[] = [];
  const mult = 1 + Math.min(C.WAVE_SPEED_CAP, C.WAVE_SPEED_STEP * (n - 1));
  for (let i = 0; i < C.WAVE_BASE_ROCKS + n; i++) {
    let p: { x: number; y: number };
    do p = { x: Math.random() * C.FIELD_W, y: Math.random() * C.FIELD_H };
    while (
      distance(p, sh) < C.WAVE_MIN_SHIP_DIST ||
      distance(p, { x: C.STAR_X, y: C.STAR_Y }) < C.WAVE_MIN_STAR_DIST
    );
    const a = Math.random() * Math.PI * 2,
      v =
        (posed ??
          C.ROCK_SPEED_MIN.large +
            Math.random() * (C.ROCK_SPEED_MAX.large - C.ROCK_SPEED_MIN.large)) *
        mult;
    rocks.push({
      id: id++,
      ...p,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      size: "large",
      spin: Math.random() * 6.28,
      health: C.ROCK_HEALTH.large,
      flash: 0,
    });
  }
  return { rocks, id };
}
function fresh(s: DeepReadonly<ShatterState>) {
  const b = base(),
    w = wave(1, b.ship, 1);
  return {
    ...b,
    screen: "playing" as const,
    wave: 1,
    muted: s.muted,
    rocks: w.rocks,
    nextId: w.id,
  };
}
function grav<T extends { x: number; y: number; vx: number; vy: number }>(
  b: T,
): T {
  const x = C.STAR_X - b.x,
    y = C.STAR_Y - b.y,
    d = Math.hypot(x, y);
  if (!d) return b;
  const a = C.MU / Math.max(d, C.SOFTEN) ** 2;
  return {
    ...b,
    vx: b.vx + (x / d) * a * C.TICK_DT,
    vy: b.vy + (y / d) * a * C.TICK_DT,
  };
}
function move<T extends { x: number; y: number; vx: number; vy: number }>(
  b: T,
): T {
  return {
    ...b,
    x: wrap(b.x + b.vx * C.TICK_DT, C.FIELD_W),
    y: wrap(b.y + b.vy * C.TICK_DT, C.FIELD_H),
  };
}
function score(s: ShatterState, n: number, api: UpdateApi) {
  const a = Math.floor(s.score / C.EXTRA_LIFE_STEP),
    v = s.score + n,
    b = Math.floor(v / C.EXTRA_LIFE_STEP),
    gain = b - a;
  if (gain) api.audio.play(C.CUES.extraLife);
  return {
    ...s,
    score: v,
    lives: s.lives + gain,
    extraLifeFlash: gain ? 0.8 : s.extraLifeFlash,
  };
}
function breakRock(
  s: ShatterState,
  r: RockState,
  x: number,
  y: number,
  torp: boolean,
  api: UpdateApi,
) {
  api.audio.play(C.CUES.shatter);
  const n = score(
      s,
      r.size === "large"
        ? C.SCORE_LARGE
        : r.size === "medium"
          ? C.SCORE_MEDIUM
          : C.SCORE_SMALL,
      api,
    ),
    z = C.ROCK_CHILD[r.size];
  if (!z) return n;
  const l = Math.hypot(x, y) || 1;
  let dx = x / l,
    dy = y / l;
  if (!torp) [dx, dy] = [-dy, dx];
  const kick = torp ? C.TORPEDO_SCATTER : C.SPLIT_KICK,
    children = [-1, 1].map((q, i): RockState => ({
      id: n.nextId + i,
      x: r.x,
      y: r.y,
      vx: r.vx + dx * kick * q,
      vy: r.vy + dy * kick * q,
      size: z!,
      spin: r.spin + q * 0.3,
      health: C.ROCK_HEALTH[z!],
      flash: 0,
    }));
  return { ...n, rocks: [...n.rocks, ...children], nextId: n.nextId + 2 };
}
function tick(
  s: ShatterState,
  hold: {
    left: boolean;
    right: boolean;
    up: boolean;
    fire: boolean;
    torp: boolean;
  },
  api: UpdateApi,
) {
  let n = {
    ...s,
    simTime: s.simTime + C.TICK_DT,
    extraLifeFlash: Math.max(0, (s.extraLifeFlash ?? 0) - C.TICK_DT),
  };
  if (n.screen !== "playing") return n;
  const angle =
    n.ship.angle +
    ((hold.right ? 1 : 0) - (hold.left ? 1 : 0)) * C.SHIP_TURN * C.TICK_DT;
  let vx = n.ship.vx,
    vy = n.ship.vy;
  if (hold.up) {
    vx += Math.cos(angle) * C.SHIP_THRUST * C.TICK_DT;
    vy += Math.sin(angle) * C.SHIP_THRUST * C.TICK_DT;
  }
  const drag = 0.5 ** (C.TICK_DT / C.SHIP_DRAG_HALFLIFE);
  vx *= drag;
  vy *= drag;
  const speed = Math.hypot(vx, vy);
  if (speed > C.SHIP_MAX) {
    vx *= C.SHIP_MAX / speed;
    vy *= C.SHIP_MAX / speed;
  }
  let sh = move({
    ...n.ship,
    angle,
    vx,
    vy,
    thrusting: hold.up,
    invuln: Math.max(0, n.ship.invuln - C.TICK_DT),
    fireCooldown: Math.max(0, n.ship.fireCooldown - 1),
  });
  const sd = Math.hypot(sh.x - C.STAR_X, sh.y - C.STAR_Y);
  if (sd < C.CORE_R + C.SHIP_R) {
    const ux = (sh.x - C.STAR_X) / (sd || 1),
      uy = (sh.y - C.STAR_Y) / (sd || 1),
      inside = Math.min(0, sh.vx * ux + sh.vy * uy);
    sh = {
      ...sh,
      x: C.STAR_X + ux * (C.CORE_R + C.SHIP_R),
      y: C.STAR_Y + uy * (C.CORE_R + C.SHIP_R),
      vx: sh.vx - inside * ux,
      vy: sh.vy - inside * uy,
    };
  }
  const bullets = n.bullets
    .map((b) => move(grav({ ...b, life: b.life - C.TICK_DT })))
    .filter(
      (b) =>
        b.life > 0 &&
        !touching(b, C.BULLET_R, { x: C.STAR_X, y: C.STAR_Y }, C.CORE_R),
    );
  if (hold.fire && sh.fireCooldown === 0 && bullets.length < C.MAX_BULLETS) {
    const x = Math.cos(angle),
      y = Math.sin(angle);
    bullets.push({
      id: n.nextId++,
      x: wrap(sh.x + x * C.SHIP_R, C.FIELD_W),
      y: wrap(sh.y + y * C.SHIP_R, C.FIELD_H),
      vx: sh.vx + x * C.MUZZLE_SPEED,
      vy: sh.vy + y * C.MUZZLE_SPEED,
      life: C.BULLET_LIFE,
    });
    sh = { ...sh, fireCooldown: C.FIRE_INTERVAL_TICKS };
    api.audio.play(C.CUES.fire);
  }
  const torpedoes = n.torpedoes
    .map((t) => {
      let h = t.heading;
      if (t.homing) {
        let target: number | undefined,
          best = Infinity;
        for (const q of [...n.rocks, ...(n.saucer ? [n.saucer] : [])]) {
          const x = d1(t.x, q.x, C.FIELD_W),
            y = d1(t.y, q.y, C.FIELD_H),
            a = Math.atan2(y, x),
            d = Math.hypot(x, y);
          if (Math.abs(adelta(h, a)) <= C.TORPEDO_CONE && d < best) {
            target = a;
            best = d;
          }
        }
        if (target !== undefined) {
          const m = C.TORPEDO_TURN * C.TICK_DT;
          h += Math.max(-m, Math.min(m, adelta(h, target)));
        }
      }
      return move({
        ...t,
        heading: h,
        vx: Math.cos(h) * C.TORPEDO_SPEED,
        vy: Math.sin(h) * C.TORPEDO_SPEED,
        life: t.life - C.TICK_DT,
      });
    })
    .filter(
      (t) =>
        t.life > 0 &&
        !touching(t, C.TORPEDO_R, { x: C.STAR_X, y: C.STAR_Y }, C.CORE_R),
    );
  let charge = Math.min(1, n.torpedoCharge + C.TICK_DT / C.TORPEDO_RECHARGE);
  if (hold.torp && charge === 1 && !torpedoes.length) {
    torpedoes.push({
      id: n.nextId++,
      x: wrap(sh.x + Math.cos(angle) * C.SHIP_R, C.FIELD_W),
      y: wrap(sh.y + Math.sin(angle) * C.SHIP_R, C.FIELD_H),
      vx: Math.cos(angle) * C.TORPEDO_SPEED,
      vy: Math.sin(angle) * C.TORPEDO_SPEED,
      heading: angle,
      life: C.TORPEDO_LIFE,
      homing: true,
    });
    charge = 0;
  }
  let rocks = n.rocks.map((r) =>
    move(
      grav({
        ...r,
        spin: r.spin + 0.35 * C.TICK_DT,
        flash: Math.max(0, r.flash - C.TICK_DT),
      }),
    ),
  );
  rocks = rocks.map((r) => {
    if (
      !touching(
        r,
        C.ROCK_RADIUS[r.size],
        { x: C.STAR_X, y: C.STAR_Y },
        C.CORE_R,
      )
    )
      return r;
    const edges = ["top", "bottom", "left", "right"] as const,
      e = n.nextRecycleEdge ?? edges[Math.floor(Math.random() * 4)],
      p = Math.random(),
      x = e === "left" ? 0 : e === "right" ? C.FIELD_W : p * C.FIELD_W,
      y = e === "top" ? 0 : e === "bottom" ? C.FIELD_H : p * C.FIELD_H,
      v =
        n.nextRockSpeed ??
        C.ROCK_SPEED_MIN[r.size] +
          Math.random() * (C.ROCK_SPEED_MAX[r.size] - C.ROCK_SPEED_MIN[r.size]),
      a = Math.atan2(C.STAR_Y - y, C.STAR_X - x);
    n = { ...n, nextRecycleEdge: null, nextRockSpeed: null };
    return { ...r, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v };
  });
  let saucer = n.saucer;
  if (saucer) {
    let q = {
      ...saucer,
      age: saucer.age + C.TICK_DT,
      fireClock: saucer.fireClock - C.TICK_DT,
      weaveClock: saucer.weaveClock - C.TICK_DT,
    };
    if (q.mind && q.weaveClock <= 0) {
      const dir: 1 | -1 = q.vy === 0 ? q.weave : q.vy > 0 ? -1 : 1;
      q = {
        ...q,
        vy: dir * C.SAUCER_WEAVE_SPEED,
        weave: dir,
        weaveClock: C.SAUCER_WEAVE_INTERVAL,
      };
    }
    if (q.travel) q = move(q);
    const d = Math.hypot(q.x - C.STAR_X, q.y - C.STAR_Y);
    if (q.mind && d < C.CORE_R + C.SAUCER_R + 12) {
      const k: 1 | -1 = q.y >= C.STAR_Y ? 1 : -1;
      q = {
        ...q,
        y: C.STAR_Y + k * (C.CORE_R + C.SAUCER_R + 12),
        vy: k * C.SAUCER_WEAVE_SPEED,
      };
    }
    if (q.gun && q.fireClock <= 0) {
      const a =
        Math.atan2(d1(q.y, sh.y, C.FIELD_H), d1(q.x, sh.x, C.FIELD_W)) +
        (n.nextSaucerAim ?? (Math.random() * 2 - 1) * C.SAUCER_AIM_ERROR);
      n = {
        ...n,
        nextSaucerAim: null,
        enemyBullets: [
          ...n.enemyBullets,
          {
            id: n.nextId++,
            x: q.x,
            y: q.y,
            vx: q.vx + Math.cos(a) * C.SAUCER_BULLET_SPEED,
            vy: q.vy + Math.sin(a) * C.SAUCER_BULLET_SPEED,
            life: C.SAUCER_BULLET_LIFE,
          },
        ],
      };
      q = { ...q, fireClock: C.SAUCER_FIRE_INTERVAL };
    }
    saucer = q.age >= C.SAUCER_LIFETIME ? null : q;
    if (!saucer)
      n = {
        ...n,
        saucerClock: 0,
        saucerDue:
          C.SAUCER_GAP_MIN +
          Math.random() * (C.SAUCER_GAP_MAX - C.SAUCER_GAP_MIN),
      };
  }
  const enemy = n.enemyBullets
    .map((b) => move(grav({ ...b, life: b.life - C.TICK_DT })))
    .filter(
      (b) =>
        b.life > 0 &&
        !touching(b, C.SAUCER_BULLET_R, { x: C.STAR_X, y: C.STAR_Y }, C.CORE_R),
    );
  n = {
    ...n,
    ship: sh,
    bullets,
    rocks,
    torpedoes,
    torpedoCharge: charge,
    saucer,
    enemyBullets: enemy,
    waveBanner: Math.max(0, n.waveBanner - C.TICK_DT),
  };
  for (const b of [...n.bullets]) {
    const r = n.rocks.find((x) =>
      touching(b, C.BULLET_R, x, C.ROCK_RADIUS[x.size]),
    );
    if (r) {
      n = {
        ...n,
        bullets: n.bullets.filter((x) => x.id !== b.id),
        rocks: n.rocks.filter((x) => x.id !== r.id),
      };
      n =
        r.health > 1
          ? {
              ...n,
              rocks: [
                ...n.rocks,
                { ...r, health: r.health - 1, flash: C.HIT_FLASH_TIME },
              ],
            }
          : breakRock(n, r, b.vx, b.vy, false, api);
      continue;
    }
    if (n.saucer && touching(b, C.BULLET_R, n.saucer, C.SAUCER_R))
      n = score(
        {
          ...n,
          bullets: n.bullets.filter((x) => x.id !== b.id),
          saucer: null,
          saucerClock: 0,
        },
        C.SCORE_SAUCER,
        api,
      );
  }
  for (const t of [...n.torpedoes]) {
    const r = n.rocks.find((x) =>
      touching(t, C.TORPEDO_R, x, C.ROCK_RADIUS[x.size]),
    );
    if (r) {
      n = {
        ...n,
        torpedoes: n.torpedoes.filter((x) => x.id !== t.id),
        rocks: n.rocks.filter((x) => x.id !== r.id),
      };
      n = breakRock(n, r, t.vx, t.vy, true, api);
    } else if (n.saucer && touching(t, C.TORPEDO_R, n.saucer, C.SAUCER_R))
      n = score(
        {
          ...n,
          torpedoes: n.torpedoes.filter((x) => x.id !== t.id),
          saucer: null,
          saucerClock: 0,
        },
        C.SCORE_SAUCER,
        api,
      );
  }
  let lethal =
    n.ship.collision &&
    n.ship.invuln <= 0 &&
    (n.rocks.some((r) =>
      touching(n.ship, C.SHIP_R, r, C.ROCK_RADIUS[r.size]),
    ) ||
      (!!n.saucer && touching(n.ship, C.SHIP_R, n.saucer, C.SAUCER_R)));
  const hit = n.enemyBullets.find((b) =>
    touching(n.ship, C.SHIP_R, b, C.SAUCER_BULLET_R),
  );
  if (hit && n.ship.collision && n.ship.invuln <= 0) {
    lethal = true;
    n = { ...n, enemyBullets: n.enemyBullets.filter((x) => x.id !== hit.id) };
  }
  if (lethal) {
    api.audio.play(C.CUES.death);
    const lives = n.lives - 1;
    n = {
      ...n,
      lives,
      screen: lives ? "playing" : "gameover",
      menuIndex: 0,
      ship: lives ? ship(C.INVULN_TIME) : n.ship,
      torpedoes: [],
      torpedoCharge: 1,
    };
  }
  if (!n.saucer) {
    const clock = n.saucerClock + C.TICK_DT;
    if (n.saucerSpawning && clock >= n.saucerDue) {
      const edge = n.nextSaucerEdge ?? (Math.random() < 0.5 ? "left" : "right"),
        y =
          n.nextSaucerRow ??
          C.SAUCER_R + Math.random() * (C.FIELD_H - 2 * C.SAUCER_R),
        k = edge === "left" ? 1 : -1;
      n = {
        ...n,
        saucer: {
          id: n.nextId++,
          x: edge === "left" ? 0 : C.FIELD_W,
          y,
          vx: k * C.SAUCER_SPEED,
          vy: 0,
          mind: true,
          gun: true,
          travel: true,
          weave: Math.random() < 0.5 ? 1 : -1,
          fireClock: C.SAUCER_FIRE_INTERVAL,
          weaveClock: C.SAUCER_WEAVE_INTERVAL,
          age: 0,
        },
        nextSaucerEdge: null,
        nextSaucerRow: null,
        saucerClock: 0,
      };
      api.audio.play(C.CUES.saucer);
    } else n = { ...n, saucerClock: clock };
  }
  if (s.waveBanner > 0 && n.waveBanner === 0 && n.waveSpawning) {
    const w = wave(n.wave, n.ship, n.nextId, n.nextRockSpeed);
    n = {
      ...n,
      rocks: w.rocks,
      nextId: w.id,
      nextRockSpeed: null,
      waveBanner: 0,
    };
  }
  return n;
}

const set = (
  s: DeepReadonly<ShatterState>,
  key: keyof ShatterState,
  v: unknown,
) => ({ ...copy(s), [key]: v }) as ShatterState;
const findRock = (s: DeepReadonly<ShatterState>, id: number) => {
  const r = s.rocks.find((x) => x.id === id);
  if (!r) throw new RangeError("unknown id");
  return r;
};
const findT = (s: DeepReadonly<ShatterState>, id: number) => {
  const r = s.torpedoes.find((x) => x.id === id);
  if (!r) throw new RangeError("unknown id");
  return r;
};
const sau = (s: DeepReadonly<ShatterState>) => {
  if (!s.saucer) throw new Error("no saucer");
  return s.saucer;
};
const remove = (
  s: DeepReadonly<ShatterState>,
  k: "bullets" | "enemyBullets" | "rocks" | "torpedoes",
  id: number,
) => {
  finite(id);
  if (!s[k].some((x) => x.id === id)) throw new RangeError("unknown id");
  return set(
    s,
    k,
    s[k].filter((x) => x.id !== id),
  );
};
const debug = {
  version: C.SHATTER_DEBUG_VERSION,
  reset: (s: DeepReadonly<ShatterState>) => ({ ...base(), muted: s.muted }),
  snapshot: snap,
  reconcile: copy,
  menuItemRect: rect,
  setScreen: (s: DeepReadonly<ShatterState>, v: Screen) => {
    if (!["title", "howto", "playing", "paused", "gameover"].includes(v))
      throw new TypeError("screen");
    return set(s, "screen", v);
  },
  setMenuIndex: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "menuIndex", v)
  ),
  setScore: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "score", v)
  ),
  setLives: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "lives", v)
  ),
  setWave: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "wave", v)
  ),
  setWaveBanner: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "waveBanner", v)
  ),
  setWaveSpawning: (s: DeepReadonly<ShatterState>, v: boolean) =>
    set(s, "waveSpawning", v),
  setSaucerSpawning: (s: DeepReadonly<ShatterState>, v: boolean) =>
    set(s, "saucerSpawning", v),
  setSaucerDue: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "saucerDue", v)
  ),
  setShipPosition: (s: DeepReadonly<ShatterState>, x: number, y: number) => (
    finite(x, y),
    set(s, "ship", { ...s.ship, x, y })
  ),
  setShipVelocity: (s: DeepReadonly<ShatterState>, vx: number, vy: number) => (
    finite(vx, vy),
    set(s, "ship", { ...s.ship, vx, vy })
  ),
  setShipAngle: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "ship", { ...s.ship, angle: v })
  ),
  setShipInvuln: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "ship", { ...s.ship, invuln: v })
  ),
  setFireCooldown: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "ship", { ...s.ship, fireCooldown: v })
  ),
  setShipCollision: (s: DeepReadonly<ShatterState>, v: boolean) =>
    set(s, "ship", { ...s.ship, collision: v }),
  addBullet: (
    s: DeepReadonly<ShatterState>,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) => (
    finite(x, y, vx, vy),
    {
      ...copy(s),
      bullets: [
        ...s.bullets,
        { id: s.nextId, x, y, vx, vy, life: C.BULLET_LIFE },
      ],
      nextId: s.nextId + 1,
    }
  ),
  removeBullet: (s: DeepReadonly<ShatterState>, id: number) =>
    remove(s, "bullets", id),
  clearBullets: (s: DeepReadonly<ShatterState>) => set(s, "bullets", []),
  addEnemyBullet: (
    s: DeepReadonly<ShatterState>,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) => (
    finite(x, y, vx, vy),
    {
      ...copy(s),
      enemyBullets: [
        ...s.enemyBullets,
        { id: s.nextId, x, y, vx, vy, life: C.SAUCER_BULLET_LIFE },
      ],
      nextId: s.nextId + 1,
    }
  ),
  removeEnemyBullet: (s: DeepReadonly<ShatterState>, id: number) =>
    remove(s, "enemyBullets", id),
  clearEnemyBullets: (s: DeepReadonly<ShatterState>) =>
    set(s, "enemyBullets", []),
  addRock: (
    s: DeepReadonly<ShatterState>,
    z: RockSize,
    x: number,
    y: number,
  ) => {
    finite(x, y);
    if (!["large", "medium", "small"].includes(z)) throw new TypeError("size");
    return {
      ...copy(s),
      rocks: [
        ...s.rocks,
        {
          id: s.nextId,
          x,
          y,
          vx: 0,
          vy: 0,
          size: z,
          spin: 0,
          health: C.ROCK_HEALTH[z],
          flash: 0,
        },
      ],
      nextId: s.nextId + 1,
    };
  },
  setRockVelocity: (
    s: DeepReadonly<ShatterState>,
    id: number,
    vx: number,
    vy: number,
  ) => (
    finite(vx, vy),
    set(
      s,
      "rocks",
      s.rocks.map((x) => (x.id === findRock(s, id).id ? { ...x, vx, vy } : x)),
    )
  ),
  setRockHealth: (s: DeepReadonly<ShatterState>, id: number, h: number) => {
    const r = findRock(s, id);
    if (!Number.isInteger(h) || h < 1 || h > C.ROCK_HEALTH[r.size])
      throw new RangeError("health");
    return set(
      s,
      "rocks",
      s.rocks.map((x) => (x.id === id ? { ...x, health: h } : x)),
    );
  },
  removeRock: (s: DeepReadonly<ShatterState>, id: number) =>
    remove(s, "rocks", id),
  clearRocks: (s: DeepReadonly<ShatterState>) => set(s, "rocks", []),
  addSaucer: (s: DeepReadonly<ShatterState>, x: number, y: number) => (
    finite(x, y),
    {
      ...copy(s),
      saucer: {
        id: s.nextId,
        x,
        y,
        vx: C.SAUCER_SPEED,
        vy: 0,
        mind: true,
        gun: true,
        travel: true,
        weave: 1 as const,
        fireClock: C.SAUCER_FIRE_INTERVAL,
        weaveClock: C.SAUCER_WEAVE_INTERVAL,
        age: 0,
      },
      nextId: s.nextId + 1,
    }
  ),
  setSaucerVelocity: (
    s: DeepReadonly<ShatterState>,
    vx: number,
    vy: number,
  ) => (finite(vx, vy), set(s, "saucer", { ...sau(s), vx, vy })),
  setSaucerWeave: (s: DeepReadonly<ShatterState>, v: 1 | -1) => {
    if (v !== 1 && v !== -1) throw new RangeError("weave");
    return set(s, "saucer", { ...sau(s), weave: v });
  },
  removeSaucer: (s: DeepReadonly<ShatterState>) => set(s, "saucer", null),
  setSaucerMind: (s: DeepReadonly<ShatterState>, v: boolean) =>
    set(s, "saucer", { ...sau(s), mind: v }),
  setSaucerGun: (s: DeepReadonly<ShatterState>, v: boolean) =>
    set(s, "saucer", { ...sau(s), gun: v }),
  setSaucerTravel: (s: DeepReadonly<ShatterState>, v: boolean) =>
    set(s, "saucer", { ...sau(s), travel: v }),
  setNextSaucerEdge: (s: DeepReadonly<ShatterState>, v: SaucerEdge) =>
    set(s, "nextSaucerEdge", v),
  setNextSaucerRow: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "nextSaucerRow", v)
  ),
  setNextSaucerAim: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "nextSaucerAim", v)
  ),
  setNextRockSpeed: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "nextRockSpeed", v)
  ),
  setNextRecycleEdge: (s: DeepReadonly<ShatterState>, v: FieldEdge) =>
    set(s, "nextRecycleEdge", v),
  setTorpedoCharge: (s: DeepReadonly<ShatterState>, v: number) => (
    finite(v),
    set(s, "torpedoCharge", v)
  ),
  addTorpedo: (
    s: DeepReadonly<ShatterState>,
    x: number,
    y: number,
    h: number,
  ) => (
    finite(x, y, h),
    {
      ...copy(s),
      torpedoes: [
        ...s.torpedoes,
        {
          id: s.nextId,
          x,
          y,
          vx: Math.cos(h) * C.TORPEDO_SPEED,
          vy: Math.sin(h) * C.TORPEDO_SPEED,
          heading: h,
          life: C.TORPEDO_LIFE,
          homing: true,
        },
      ],
      nextId: s.nextId + 1,
    }
  ),
  setTorpedoHeading: (s: DeepReadonly<ShatterState>, id: number, h: number) => (
    finite(h),
    set(
      s,
      "torpedoes",
      s.torpedoes.map((x) =>
        x.id === findT(s, id).id
          ? {
              ...x,
              heading: h,
              vx: Math.cos(h) * C.TORPEDO_SPEED,
              vy: Math.sin(h) * C.TORPEDO_SPEED,
            }
          : x,
      ),
    )
  ),
  setTorpedoHoming: (s: DeepReadonly<ShatterState>, id: number, v: boolean) =>
    set(
      s,
      "torpedoes",
      s.torpedoes.map((x) =>
        x.id === findT(s, id).id ? { ...x, homing: v } : x,
      ),
    ),
  removeTorpedo: (s: DeepReadonly<ShatterState>, id: number) =>
    remove(s, "torpedoes", id),
  clearTorpedoes: (s: DeepReadonly<ShatterState>) => set(s, "torpedoes", []),
};
export type ShatterDebugApi = typeof debug;
function menuCount(s: ShatterState) {
  return s.screen === "paused"
    ? 3
    : s.screen === "title" || s.screen === "gameover"
      ? 2
      : 0;
}
function choose(s: ShatterState) {
  if (s.screen === "title")
    return s.menuIndex ? { ...s, screen: "howto" as const } : fresh(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: "playing" as const, menuIndex: 0 }
      : s.menuIndex === 1
        ? fresh(s)
        : { ...s, screen: "title" as const, menuIndex: 0 };
  if (s.screen === "gameover")
    return s.menuIndex === 0
      ? fresh(s)
      : { ...s, screen: "title" as const, menuIndex: 0 };
  return s;
}
export const game: Game<ShatterState, ShatterDebugApi> = {
  initialize(api: InitApi<ShatterState>) {
    for (const a of C.ACTIONS) api.input.register(a, C.BINDINGS[a]);
    const cues = [
      [C.CUES.fire, 760, 260, 70],
      [C.CUES.shatter, 130, 45, 220],
      [C.CUES.thrust, 58, 58, 100],
      [C.CUES.saucer, 420, 680, 300],
      [C.CUES.death, 220, 35, 600],
      [C.CUES.extraLife, 660, 1100, 450],
    ] as const;
    for (const [name, freq, freqTo, durationMs] of cues)
      api.audio.define(name, {
        wave: "sawtooth",
        freq,
        freqTo,
        durationMs,
        gain: 0.1,
      });
    const ds: [
      string,
      (s: DeepReadonly<ShatterState>) => string | number | boolean,
    ][] = [
      ["screen", (s) => s.screen],
      ["score", (s) => s.score],
      ["lives", (s) => s.lives],
      ["wave", (s) => s.wave],
      ["ship pos", (s) => `${s.ship.x.toFixed(1)}, ${s.ship.y.toFixed(1)}`],
      ["ship vel", (s) => `${s.ship.vx.toFixed(1)}, ${s.ship.vy.toFixed(1)}`],
      ["ship speed", (s) => Math.hypot(s.ship.vx, s.ship.vy)],
      ["ship facing", (s) => s.ship.angle],
      ["ship grace", (s) => s.ship.invuln],
      ["bullets", (s) => s.bullets.length],
      ["rocks", (s) => s.rocks.length],
      [
        "saucer",
        (s) =>
          s.saucer
            ? `${s.saucer.x.toFixed(1)}, ${s.saucer.y.toFixed(1)}`
            : "none",
      ],
      ["torpedo charge", (s) => s.torpedoCharge],
      ["torpedoes", (s) => s.torpedoes.length],
      ["sim time", (s) => s.simTime],
    ];
    for (const [a, b] of ds) api.diagnostics.register(a, b);
    return [base(), debug];
  },
  update(state, api, dt) {
    let s = copy(state);
    if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
    s = { ...s, muted: api.audio.muted() };
    if (s.screen === "playing" && api.input.pressed("pause"))
      s = { ...s, screen: "paused", menuIndex: 0 };
    else if (
      s.screen === "paused" &&
      (api.input.pressed("pause") || api.input.pressed("back"))
    )
      s = { ...s, screen: "playing", menuIndex: 0 };
    else if (
      s.screen === "howto" &&
      (api.input.pressed("confirm") || api.input.pressed("back"))
    )
      s = { ...s, screen: "title" };
    else if (s.screen === "gameover" && api.input.pressed("back"))
      s = { ...s, screen: "title", menuIndex: 0 };
    else if (menuCount(s)) {
      const n = menuCount(s);
      if (api.input.pressed("up"))
        s = { ...s, menuIndex: wrap(s.menuIndex - 1, n) };
      if (api.input.pressed("down"))
        s = { ...s, menuIndex: wrap(s.menuIndex + 1, n) };
      if (api.input.pressed("confirm")) s = choose(s);
      const p = api.input.pointer();
      for (let i = 0; i < menuCount(s); i++) {
        const r = rect(s, i)!;
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
          s = { ...s, menuIndex: i };
      }
      const pointed = Array.from({ length: menuCount(s) }, (_, i) => i).find(
        (i) => {
          const r = rect(s, i)!;
          return (
            p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
          );
        },
      );
      if (api.input.pointerPressed()) s = { ...s, menuPress: pointed ?? null };
      if (api.input.pointerReleased()) {
        const confirm = pointed !== undefined && pointed === s.menuPress;
        s = { ...s, menuPress: null };
        if (confirm) s = choose(s);
      }
    }
    const up = s.screen === "playing" && api.input.value("up") > 0;
    if (up && !api.audio.looping(C.CUES.thrust)) api.audio.loop(C.CUES.thrust);
    if (!up && api.audio.looping(C.CUES.thrust)) api.audio.stop(C.CUES.thrust);
    const total = s.tickClock + Math.max(0, dt),
      ticks = Math.floor((total + 1e-12) / C.TICK_DT);
    const torp = s.screen === "playing" && api.input.pressed("b");
    for (let i = 0; i < ticks; i++) {
      const before = s.rocks.length;
      s = tick(
        s,
        {
          left: api.input.value("left") > 0,
          right: api.input.value("right") > 0,
          up,
          fire: api.input.value("a") > 0,
          torp: torp && i === 0,
        },
        api,
      );
      if (before > 0 && !s.rocks.length && s.waveSpawning)
        s = { ...s, wave: s.wave + 1, waveBanner: C.WAVE_BANNER_TIME };
    }
    return {
      ...s,
      tickClock: Math.max(0, total - ticks * C.TICK_DT),
      muted: api.audio.muted(),
    };
  },
  render(s, api) {
    draw(s, api.ctx);
  },
};

function label(
  ctx: CanvasRenderingContext2D,
  t: string,
  x: number,
  y: number,
  z: number,
  c = "#e8f7ff",
  a: CanvasTextAlign = "center",
) {
  ctx.fillStyle = c;
  ctx.font = `700 ${z}px system-ui,sans-serif`;
  ctx.textAlign = a;
  ctx.fillText(t, x, y);
}
function draw(s: DeepReadonly<ShatterState>, ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(
    C.STAR_X,
    C.STAR_Y,
    C.CORE_R,
    C.STAR_X,
    C.STAR_Y,
    C.HALO_R * 1.5,
  );
  g.addColorStop(0, "#61cfff88");
  g.addColorStop(1, "#05071100");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(C.STAR_X, C.STAR_Y, C.HALO_R * 1.5, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#e7ffff";
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#67dcff";
  ctx.beginPath();
  ctx.arc(C.STAR_X, C.STAR_Y, C.CORE_R, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  for (const r of s.rocks) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.spin);
    ctx.fillStyle = "#1d293b";
    ctx.strokeStyle = r.flash ? "#fff" : "#a6b5c7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5,
        v = C.ROCK_RADIUS[r.size] * (0.8 + ((r.id + i * 13) % 17) / 100);
      if (i) ctx.lineTo(Math.cos(a) * v, Math.sin(a) * v);
      else ctx.moveTo(Math.cos(a) * v, Math.sin(a) * v);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (r.health < C.ROCK_HEALTH[r.size]) {
      ctx.strokeStyle = "#ff756e";
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(2, 3);
      ctx.lineTo(12, -12);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const b of s.bullets) {
    ctx.strokeStyle = "#73ddff88";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(
      b.x - b.vx * C.TICK_DT * C.TRAIL_TICKS,
      b.y - b.vy * C.TICK_DT * C.TRAIL_TICKS,
    );
    ctx.stroke();
    ctx.fillStyle = "#dfffff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, C.BULLET_R, 0, 7);
    ctx.fill();
  }
  for (const b of s.enemyBullets) {
    ctx.fillStyle = "#ff5f8b";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, 7);
    ctx.fill();
  }
  for (const t of s.torpedoes) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.heading);
    ctx.fillStyle = "#ffc55c";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 5);
    ctx.fill();
    ctx.restore();
  }
  if (s.saucer) {
    ctx.strokeStyle = "#ff74d4";
    ctx.fillStyle = "#341945";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(s.saucer.x, s.saucer.y, 25, 10, 0, 0, 7);
    ctx.fill();
    ctx.stroke();
  }
  if (
    s.screen !== "gameover" &&
    (s.ship.invuln <= 0 || Math.floor(s.ship.invuln * 10) % 2 === 0)
  ) {
    ctx.save();
    ctx.translate(s.ship.x, s.ship.y);
    ctx.rotate(s.ship.angle);
    if (s.ship.thrusting) {
      ctx.fillStyle = "#ff8b4e";
      ctx.beginPath();
      ctx.moveTo(-12, -7);
      ctx.lineTo(-28, 0);
      ctx.lineTo(-12, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#0c2134";
    ctx.strokeStyle = "#72e7ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-16, -13);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-16, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (["playing", "paused", "gameover"].includes(s.screen)) {
    label(ctx, String(s.score).padStart(6, "0"), 35, 52, 29, "#fff", "left");
    for (let i = 0; i < s.lives - 1; i++) {
      ctx.strokeStyle = "#72e7ff";
      ctx.strokeRect(35 + i * 26, 72, 16, 10);
    }
    label(
      ctx,
      "TORPEDO",
      35,
      106,
      13,
      s.torpedoCharge === 1 ? "#ffc55c" : "#68748a",
      "left",
    );
    ctx.strokeStyle = "#607084";
    ctx.strokeRect(35, 112, 140, 9);
    ctx.fillStyle = "#ffc55c";
    ctx.fillRect(35, 112, 140 * s.torpedoCharge, 9);
    if (s.waveBanner) label(ctx, `WAVE ${s.wave}`, 640, 380, 56);
    if (s.extraLifeFlash) label(ctx, "EXTRA SHIP", 640, 150, 26, "#ffc55c");
  }
  if (s.screen === "title") {
    label(ctx, C.TITLE_TEXT, 640, 245, 104, "#e4fbff");
    label(ctx, C.TAGLINE_TEXT, 640, 300, 21, "#758aa5");
    drawMenu(ctx, s, C.TITLE_ITEMS);
  } else if (s.screen === "howto") {
    label(ctx, "HOW TO PLAY", 640, 85, 44);
    [
      "SHATTER EVERY ROCK AND ITS FRAGMENTS TO CLEAR THE WAVE.",
      "THE WELL BENDS BULLETS AND ROCKS — NEVER YOUR SHIP.",
      "SWALLOWED ROCKS RETURN. ARMORED ROCKS SHOW THEIR SCARS.",
      "THE SAUCER HUNTS YOU. SHOOT IT DOWN.",
      "F: GUIDED TORPEDO • ONE-HIT KILL • 10 SECOND RECHARGE",
      "ARROWS / WASD  FLY     SPACE  FIRE     F  TORPEDO",
      "ENTER  CONFIRM     ESC / P  PAUSE     M  MUTE",
    ].forEach((x, i) =>
      label(ctx, x, 640, 170 + i * 58, 18, i === 4 ? "#ffc55c" : "#b8cada"),
    );
    label(ctx, "ENTER OR ESC TO RETURN", 640, 650, 15, "#74849b");
  } else if (s.screen === "paused") {
    ctx.fillStyle = "#03050dbb";
    ctx.fillRect(0, 0, 1280, 720);
    label(ctx, "PAUSED", 640, 270, 58);
    drawMenu(ctx, s, C.PAUSE_ITEMS);
  } else if (s.screen === "gameover") {
    ctx.fillStyle = "#03050dc4";
    ctx.fillRect(0, 0, 1280, 720);
    label(ctx, "GAME OVER", 640, 230, 64, "#ff7197");
    label(ctx, `SCORE ${s.score}  •  WAVE ${s.wave}`, 640, 300, 22, "#b8cada");
    drawMenu(ctx, s, C.GAMEOVER_ITEMS);
  }
}
function drawMenu(
  ctx: CanvasRenderingContext2D,
  s: DeepReadonly<ShatterState>,
  items: readonly string[],
) {
  items.forEach((x, i) => {
    const r = rect(s, i)!;
    if (i === s.menuIndex) {
      ctx.fillStyle = "#52ceff22";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "#59dfff";
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    label(ctx, x, 640, r.y + 33, 21, i === s.menuIndex ? "#fff" : "#71839b");
  });
}
