import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatWidget from "./ChatWidget";

afterEach(() => vi.restoreAllMocks());

describe("ChatWidget", () => {
  it("starts a session on open, shows the welcome, and sends a chat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("/api/session/start")) {
          return new Response(
            JSON.stringify({ ruId: "ru_1", created: true, name: "Richard", company: "Acme Co", originUserId: "richard@acme.co" }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ text: "Your plan allows 2." }), { status: 200 });
      })
    );

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    expect(await screen.findByText(/Welcome, Richard from Acme Co/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/ask anything/i), {
      target: { value: "Why can't I add a third location?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Why can't I add a third location?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Your plan allows 2.")).toBeInTheDocument());
  });

  it("does not start a session until the widget is opened", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatWidget />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
