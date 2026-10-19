// @vitest-environment-options {"url":"https://aoc-scriptorium.lovable.app"}
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ register: vi.fn(), toast: vi.fn(), update: vi.fn() }));
vi.mock("virtual:pwa-register", () => ({ registerSW: mocks.register }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
import { registerAppUpdates } from "./pwaUpdates";

describe("PWA updates", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
  it("offers activation only after the reader chooses refresh", () => {
    vi.stubEnv("PROD", true);
    mocks.register.mockReturnValue(mocks.update);
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {} });
    const storage = vi.spyOn(Storage.prototype, "clear");
    registerAppUpdates();
    const callbacks = mocks.register.mock.calls[0]?.[0];
    expect(callbacks).toBeDefined();
    callbacks.onNeedRefresh();
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.toast.mock.calls[0][1].action.onClick();
    expect(mocks.update).toHaveBeenCalledWith(true);
    expect(storage).not.toHaveBeenCalled();
  });
  it("does not register in development", () => {
    vi.stubEnv("PROD", false);
    registerAppUpdates();
    expect(mocks.register).not.toHaveBeenCalled();
  });
});