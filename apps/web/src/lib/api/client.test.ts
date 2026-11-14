import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "./client";
describe("typed application HTTP boundary", () => {
  it("handles empty 204 responses without parsing JSON", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    expect(
      await new ApiClient(transport).request("/places/example", {
        method: "DELETE",
      }),
    ).toBeUndefined();
  });
  it("preserves server error codes for recoverable UI states", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "unauthenticated", message: "Session expired" },
          }),
          { status: 401 },
        ),
      );
    await expect(new ApiClient(transport).request("/me")).rejects.toMatchObject(
      { status: 401, code: "unauthenticated" },
    );
  });
  it("forwards abort and auth without trusting a user_id", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { items: [] }, meta: {} })),
      );
    const controller = new AbortController();
    await new ApiClient(transport, () => "token").request("/places", {
      signal: controller.signal,
    });
    const options = transport.mock.calls[0]![1] as RequestInit;
    expect(options.signal).toBe(controller.signal);
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer token",
    );
    expect(ApiError).toBeDefined();
  });
});
