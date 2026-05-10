import { describe, expect, it } from "vitest";
import { requireEnv } from "../../src/minimal/require-env";

describe("requireEnv", () => {
  it("returns the value when set", () => {
    expect(requireEnv("MY_VAR", { MY_VAR: "ok" })).toBe("ok");
  });

  it("throws when missing", () => {
    expect(() => requireEnv("MISSING", {})).toThrow(
      "Environment variable MISSING is required",
    );
  });
});
