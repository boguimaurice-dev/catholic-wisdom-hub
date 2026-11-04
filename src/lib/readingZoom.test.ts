import { describe, expect, it } from "vitest";
import { pinchedReadingSize, readingSize } from "./readingZoom";

describe("reading zoom", () => {
  it("enlarges the text when fingers move apart", () => {
    expect(pinchedReadingSize(19, 100, 200)).toBe(38);
  });
  it("shrinks the text when fingers move together", () => {
    expect(pinchedReadingSize(38, 200, 100)).toBe(19);
  });
  it("keeps corrupt stored values and extreme gestures readable", () => {
    expect(readingSize(NaN)).toBe(19);
    expect(pinchedReadingSize(19, 0, 100)).toBe(19);
    expect(readingSize(Infinity)).toBe(19);
  });
});