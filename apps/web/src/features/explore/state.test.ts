import { describe, expect, it } from "vitest";
import {
  initialContext,
  reduceContext,
  parseContext,
  contextSearch,
} from "./state";
describe("public exploration context", () => {
  it("invalidates the old result and date on location change", () => {
    const current = {
      ...initialContext,
      selected_date: "2026-11-15",
      example_id: "old-example",
    };
    expect(
      reduceContext(current, { type: "area", area_id: "3170206" }),
    ).toMatchObject({
      area_id: "3170206",
      example_id: null,
      selected_date: null,
    });
  });
  it("round-trips public context without private query values", () => {
    const current = {
      ...initialContext,
      view: "compare" as const,
      selected_date: "2026-11-14",
    };
    expect(parseContext(contextSearch(current))).toEqual(current);
    expect(contextSearch(current)).not.toContain("user");
  });
  it("rejects an invalid URL date and view", () => {
    expect(parseContext("?view=admin&date=2026-99-99")).toMatchObject({
      view: "explore",
      selected_date: null,
    });
    expect(parseContext("?date=2026-02-30").selected_date).toBeNull();
  });
  it("restores the complete public context, including period and layer", () => {
    const previous = {
      ...initialContext,
      period: { start: "2024-04-01", end: "2024-07-31" },
      layer_id: "ndvi",
      product_id: "history" as const,
    };
    expect(parseContext(contextSearch(previous))).toEqual(previous);
    expect(
      reduceContext(initialContext, { type: "restore", context: previous }),
    ).toEqual(previous);
  });
});
