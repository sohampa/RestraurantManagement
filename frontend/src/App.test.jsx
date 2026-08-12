import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

const mockStatePayload = {
  success: true,
  message: "OK",
  data: {
    settings: {
      restaurantName: "ForkFlow Bistro",
      serviceCharge: 5,
      taxRate: 8,
    },
    menu: [
      { id: "m1", name: "Smoked Tomato Soup", category: "Starter", price: 8, stock: 22, available: true },
    ],
    tables: [
      { id: "t1", label: "T1", capacity: 2, occupied: true },
      { id: "t2", label: "T2", capacity: 4, occupied: false },
    ],
    orders: [
      { id: "o1001", customer: "Amelia", tableId: "t1", itemId: "m1", qty: 1, status: "Preparing", createdAt: "2026-08-06T12:15:00" },
    ],
    customers: [
      { name: "Amelia", visits: 12, lastVisit: "2026-08-06", spend: 372 },
    ],
  },
};

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard content after loading API state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockStatePayload,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Dashboard" })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 1, name: "ForkFlow" })).toBeInTheDocument();
    expect(screen.getByText("Revenue (Billed)")).toBeInTheDocument();
    expect(document.title).toContain("ForkFlow Bistro");
  });

  it("shows connection error message when API request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Unable to connect backend API")).toBeInTheDocument();
    });
  });
});
