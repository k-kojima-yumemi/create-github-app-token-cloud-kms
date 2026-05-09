import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({
  debug: vi.fn(),
  getInput: vi.fn<() => string>(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
}));

const waitMock = vi.hoisted(() => ({
  wait: vi.fn<() => Promise<string>>(),
}));

vi.mock("@actions/core", () => coreMock);
vi.mock("../src/wait", () => waitMock);

const { run } = await import("../src/main");

describe("main.ts", () => {
  beforeEach(() => {
    coreMock.getInput.mockImplementation(() => "500");
    waitMock.wait.mockResolvedValue("done!");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("Sets the time output", async () => {
    await run();

    expect(coreMock.setOutput).toHaveBeenNthCalledWith(
      1,
      "time",
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/),
    );
  });

  it("Sets a failed status", async () => {
    coreMock.getInput.mockClear().mockReturnValueOnce("this is not a number");
    waitMock.wait
      .mockClear()
      .mockRejectedValueOnce(new Error("milliseconds is not a number"));

    await run();

    expect(coreMock.setFailed).toHaveBeenNthCalledWith(
      1,
      "milliseconds is not a number",
    );
  });
});
