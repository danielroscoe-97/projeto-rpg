import { calculateAverage } from "@/components/combat/PollResult";

describe("calculateAverage", () => {
  it("returns 0 for empty map", () => {
    expect(calculateAverage(new Map())).toBe(0);
  });

  it("returns 0 when only DM voted (DM excluded from avg)", () => {
    const votes = new Map([["DM", 3]]);
    expect(calculateAverage(votes)).toBe(0);
  });

  it("calculates correct average for player votes", () => {
    const votes = new Map([["Ana", 2], ["Bob", 4]]);
    expect(calculateAverage(votes)).toBe(3);
  });

  it("excludes DM key from calculation", () => {
    const votes = new Map([["Ana", 2], ["Bob", 4], ["DM", 5]]);
    // avg of 2+4 = 3, DM's 5 should not be counted
    expect(calculateAverage(votes)).toBe(3);
  });

  it("handles single player vote", () => {
    const votes = new Map([["Ana", 5]]);
    expect(calculateAverage(votes)).toBe(5);
  });

  it("returns decimal average correctly", () => {
    const votes = new Map([["Ana", 1], ["Bob", 2], ["Cara", 3]]);
    expect(calculateAverage(votes)).toBe(2);
  });
});
