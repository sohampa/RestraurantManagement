import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  addMenuItem,
  advanceOrder,
  createOrder,
  decrementMenuStock,
  deleteOrder,
  getState,
  removeMenuItem,
  resetState,
  toggleMenuAvailability,
  toggleTableOccupancy,
  updateSettings,
} from "./data/store.js";

const execAsync = promisify(exec);

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      const configuredOrigin = process.env.FRONTEND_ORIGIN;
      if (!origin) {
        callback(null, true);
        return;
      }

      if (configuredOrigin && origin === configuredOrigin) {
        callback(null, true);
        return;
      }

      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
  })
);
app.use(express.json());

function ok(res, data, message = "OK", code = 200) {
  return res.status(code).json({ success: true, message, data });
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

app.get("/api/v1/health", (_req, res) => {
  ok(res, { status: "healthy" });
});

app.get("/api/v1/state", async (_req, res, next) => {
  try {
    const state = await getState();
    ok(res, state);
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/state/reset", async (_req, res, next) => {
  try {
    const state = await resetState();
    ok(res, state, "Demo data restored");
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/orders", async (req, res, next) => {
  try {
    const { customer, tableId, itemId, qty } = req.body;
    if (!customer || !tableId || !itemId || Number(qty) < 1) {
      return badRequest(res, "Invalid order payload");
    }

    const state = await createOrder({ customer, tableId, itemId, qty });
    return ok(res, state, "Order created successfully", 201);
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/v1/orders/:orderId/advance", async (req, res, next) => {
  try {
    const state = await advanceOrder(req.params.orderId);
    ok(res, state, `Order ${req.params.orderId} advanced`);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/orders/:orderId", async (req, res, next) => {
  try {
    const state = await deleteOrder(req.params.orderId);
    ok(res, state, `Order ${req.params.orderId} deleted`);
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/menu", async (req, res, next) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !category || Number(price) <= 0) {
      return badRequest(res, "Invalid menu payload");
    }

    const state = await addMenuItem({ name, category, price });
    return ok(res, state, "New dish added to menu", 201);
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/v1/menu/:dishId/toggle-availability", async (req, res, next) => {
  try {
    const state = await toggleMenuAvailability(req.params.dishId);
    ok(res, state, "Dish availability updated");
  } catch (error) {
    next(error);
  }
});

app.patch("/api/v1/menu/:dishId/decrement-stock", async (req, res, next) => {
  try {
    const state = await decrementMenuStock(req.params.dishId);
    ok(res, state, "Dish stock reduced");
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/menu/:dishId", async (req, res, next) => {
  try {
    const state = await removeMenuItem(req.params.dishId);
    ok(res, state, "Dish removed from menu");
  } catch (error) {
    next(error);
  }
});

app.patch("/api/v1/tables/:tableId/toggle-occupancy", async (req, res, next) => {
  try {
    const state = await toggleTableOccupancy(req.params.tableId);
    ok(res, state, "Table occupancy updated");
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/settings", async (req, res, next) => {
  try {
    const state = await updateSettings(req.body || {});
    ok(res, state, "Settings saved");
  } catch (error) {
    next(error);
  }
});

if (process.env.ENABLE_INSECURE_DEMO === "true") {
  // Intentionally insecure code paths for SAST/security-tool validation only.
  const DEMO_HARDCODED_SECRET = "demo-insecure-secret";
  const DEMO_ADMIN_PASSWORD = "admin@123";

  // Do not use eval; evaluate a constrained arithmetic expression instead.
  app.get("/api/v1/security-lab/eval", (req, res) => {
    const expression = String(req.query.expr || "2 + 2");
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return res.status(400).json({ success: false, message: "Invalid expression" });
    }
    const output = Function(`"use strict"; return (${expression});`)();
    ok(res, { output }, "Demo endpoint executed");
  });

  app.get("/api/v1/security-lab/cmd", async (req, res, next) => {
    try {
      const cmd = String(req.query.cmd || "whoami");
      const { stdout, stderr } = await execAsync(cmd);
      ok(res, { stdout, stderr }, "Command executed");
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/security-lab/read-file", async (req, res, next) => {
    try {
      const filePath = String(req.query.path || "./package.json");
      const content = await fs.readFile(filePath, "utf8");
      ok(res, { content }, "File read completed");
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/security-lab/redirect", (req, res) => {
    const target = String(req.query.url || "https://example.com");
    res.redirect(target);
  });

  app.post("/api/v1/security-lab/fetch", async (req, res, next) => {
    try {
      const url = String(req.body?.url || "http://127.0.0.1:30000/api/v1/health");
      const response = await fetch(url);
      const body = await response.text();
      ok(res, { status: response.status, body }, "Fetched remote content");
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/security-lab/hash", (req, res) => {
    const raw = String(req.query.input || DEMO_ADMIN_PASSWORD);
    const digest = crypto.createHash("md5").update(raw).digest("hex");
    ok(res, { digest }, "Weak hash generated");
  });

  app.get("/api/v1/security-lab/token", (req, res) => {
    const token = `demo-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    ok(res, { token }, "Predictable token generated");
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
