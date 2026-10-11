import { describe, expect, it } from "vitest";
import type { InitApi } from "@clockwyrks/simple-2d";
import { ROCK_HEALTH, SAFE_X, SAFE_Y, START_LIVES } from "./constants";
import { game, type ShatterState } from "./game";

function initialize() {
  const actions: string[] = [],
    cues: string[] = [],
    diagnostics: string[] = [];
  const api = {
    input: {
      register: (name: string) => actions.push(name),
      layout: () => null,
    },
    audio: { define: (name: string) => cues.push(name) },
    diagnostics: { register: (name: string) => diagnostics.push(name) },
  } as unknown as InitApi<ShatterState>;
  const result = game.initialize(api);
  if (result instanceof Promise)
    throw new Error("unexpected async initialization");
  const [state, debug] = result;
  return { state, debug, actions, cues, diagnostics };
}

describe("Shatter debug core", () => {
  it("initializes title state and engine declarations", () => {
    const { state, actions, cues, diagnostics } = initialize();
    expect(state).toMatchObject({
      screen: "title",
      lives: START_LIVES,
      wave: 0,
    });
    expect(state.ship).toMatchObject({ x: SAFE_X, y: SAFE_Y, collision: true });
    expect(actions).toHaveLength(10);
    expect(cues).toHaveLength(6);
    expect(diagnostics).toContain("sim time");
  });

  it("poses entities immutably and reports derived readings", () => {
    const { state, debug } = initialize();
    const moved = debug.setShipVelocity(state, 3, 4);
    const withRock = debug.addRock(moved, "large", 100, 200);
    expect(state.ship.vx).toBe(0);
    expect(debug.snapshot(withRock).ship.speed).toBe(5);
    expect(debug.snapshot(withRock).rocks[0]).toMatchObject({
      size: "large",
      health: ROCK_HEALTH.large,
      radius: 46,
    });
  });

  it("preserves mute while reset restores the run", () => {
    const { state, debug } = initialize();
    const reset = debug.reset({ ...debug.setScore(state, 900), muted: true });
    expect(reset).toMatchObject({ screen: "title", score: 0, muted: true });
    expect(reset.bullets).toEqual([]);
    expect(reset.torpedoCharge).toBe(1);
  });

  it("fails loudly for missing ids and reports menu regions", () => {
    const { state, debug } = initialize();
    expect(() => debug.removeRock(state, 99)).toThrow(/unknown id/);
    expect(debug.menuItemRect(state, 0)).not.toBeNull();
    expect(debug.menuItemRect(debug.setScreen(state, "playing"), 0)).toBeNull();
  });
});
