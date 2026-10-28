import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/login/actions", () => ({ requestStaffEmailCode: vi.fn(), verifyStaffEmailCode: vi.fn(), loginAction: vi.fn(), emailCodeInitialState: { status: "idle", message: "" } }));

import LoginPage from "@/app/login/page";

describe("staff sign-in error feedback", () => {
  it("explains when a staff invitation link is invalid or expired", async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({ error: "invalid-invitation" }),
    });

    const html = renderToStaticMarkup(element);
    expect(html).toContain("This staff invitation link is invalid or expired");
    expect(html).toContain("role=\"alert\"");
  });
});
