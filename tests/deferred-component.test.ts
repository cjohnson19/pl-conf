import { describe, expect, it, vi } from "vitest";
import { deferredComponent } from "@/lib/deferred-component";

type Props = { label?: string };
const Stub = (_props: Props) => null;

// vitest.config.ts sets unstubGlobals/restoreMocks, so stubs installed here are
// torn down even when a test fails mid-body.
const stubIdleWindow = () => {
  const idle = vi.fn((cb: () => void) => {
    cb();
    return 0;
  });
  vi.stubGlobal("window", { requestIdleCallback: idle });
  return idle;
};

describe("deferredComponent", () => {
  it("exposes the component synchronously once its chunk has loaded", async () => {
    const d = deferredComponent<Props>(async () => Stub);
    expect(d.loaded()).toBeUndefined();
    await d.load();
    expect(d.loaded()).toBe(Stub);
  });

  it("imports once across concurrent and repeated loads", async () => {
    const importer = vi.fn(async () => Stub);
    const d = deferredComponent<Props>(importer);
    await Promise.all([d.load(), d.load()]);
    await d.load();
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("skips the idle preload when the caller's predicate is false", () => {
    stubIdleWindow();

    const skipped = vi.fn(async () => Stub);
    deferredComponent<Props>(skipped).preloadWhenIdle(() => false);
    expect(skipped).not.toHaveBeenCalled();

    const taken = vi.fn(async () => Stub);
    deferredComponent<Props>(taken).preloadWhenIdle(() => true);
    expect(taken).toHaveBeenCalledTimes(1);
  });

  it("gives requestIdleCallback a timeout so a background tab still preloads", () => {
    const idle = stubIdleWindow();
    deferredComponent<Props>(async () => Stub).preloadWhenIdle();
    expect(idle).toHaveBeenCalledWith(expect.any(Function), {
      timeout: expect.any(Number),
    });
  });

  it("falls back to a post-load timer without requestIdleCallback", async () => {
    vi.useFakeTimers();
    const listeners: Array<() => void> = [];
    vi.stubGlobal("window", {
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    });
    vi.stubGlobal("document", { readyState: "loading" });

    const importer = vi.fn(async () => Stub);
    deferredComponent<Props>(importer).preloadWhenIdle();
    expect(listeners).toHaveLength(1);
    expect(importer).not.toHaveBeenCalled();

    listeners[0]();
    await vi.advanceTimersByTimeAsync(250);
    expect(importer).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does nothing when there is no window (server render)", () => {
    const importer = vi.fn(async () => Stub);
    expect(typeof window).toBe("undefined");
    deferredComponent<Props>(importer).preloadWhenIdle();
    expect(importer).not.toHaveBeenCalled();
  });

  it("retries after a failed import rather than caching the rejection", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const importer = vi
      .fn<() => Promise<typeof Stub>>()
      .mockRejectedValueOnce(new Error("chunk load failed"))
      .mockResolvedValue(Stub);
    const d = deferredComponent<Props>(importer);

    await expect(d.load()).resolves.toBeUndefined();
    expect(d.loaded()).toBeUndefined();
    expect(logged).toHaveBeenCalledTimes(1);

    await expect(d.load()).resolves.toBe(Stub);
    expect(d.loaded()).toBe(Stub);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it("retries when the importer resolves without a component", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const importer = vi
      .fn<() => Promise<typeof Stub>>()
      .mockResolvedValueOnce(undefined as unknown as typeof Stub)
      .mockResolvedValue(Stub);
    const d = deferredComponent<Props>(importer);

    await expect(d.load()).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledTimes(1);

    await expect(d.load()).resolves.toBe(Stub);
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
