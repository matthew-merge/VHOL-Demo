import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatWidget from "./ChatWidget";

afterEach(() => vi.restoreAllMocks());

describe("ChatWidget", () => {
  it("opens to a welcome message and sends a chat", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "Your plan allows 2." }), { status: 200 })));

    render(<ChatWidget userName="Richard" company="Acme Co" />);

    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));
    expect(screen.getByText(/Welcome, Richard from Acme Co/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/ask anything/i), { target: { value: "Why can't I add a third location?" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Why can't I add a third location?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Your plan allows 2.")).toBeInTheDocument());
  });
});
