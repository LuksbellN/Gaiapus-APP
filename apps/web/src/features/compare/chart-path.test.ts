import { describe, expect, it } from "vitest";
import { referencePath } from "./chart-path";
describe("source-aligned reference chart", () => {
  it("starts a new segment after a missing reference date", () => {
    const dates = ["2026-11-14", "2026-11-15", "2026-11-16"];
    const path = referencePath(
      dates,
      [
        { date: dates[0]!, storage_end_mm: 10 },
        { date: dates[2]!, storage_end_mm: 20 },
      ],
      (i) => i * 10,
      (value) => value,
    );
    expect(path).toBe("M 0 10 M 20 20");
  });
  it("links only consecutive available dates", () => {
    expect(
      referencePath(
        ["2026-11-14", "2026-11-15"],
        [
          { date: "2026-11-14", storage_end_mm: 10 },
          { date: "2026-11-15", storage_end_mm: 15 },
        ],
        (i) => i,
        (value) => value,
      ),
    ).toBe("M 0 10 L 1 15");
  });
});
