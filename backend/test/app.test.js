import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

async function resetState() {
  await request(app).post("/api/v1/state/reset");
}

test("GET /api/v1/health returns healthy status", async () => {
  const response = await request(app).get("/api/v1/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "healthy");
});

test("GET /api/v1/state returns seeded restaurant data", async () => {
  await resetState();
  const response = await request(app).get("/api/v1/state");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.settings.restaurantName, "ForkFlow Bistro");
  assert.equal(Array.isArray(response.body.data.menu), true);
  assert.equal(response.body.data.menu.length > 0, true);
  assert.equal(Array.isArray(response.body.data.tables), true);
});

test("GET /api/v1/reports/inventory-health returns metrics and preserves menu order", async () => {
  await resetState();
  const before = await request(app).get("/api/v1/state");
  const beforeIds = before.body.data.menu.map((item) => item.id);

  const response = await request(app).get("/api/v1/reports/inventory-health");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(typeof response.body.data.lowStockCount, "number");
  assert.equal(typeof response.body.data.averageStock, "number");

  const after = await request(app).get("/api/v1/state");
  assert.deepEqual(
    after.body.data.menu.map((item) => item.id),
    beforeIds,
    "inventory health report must not reorder state.menu"
  );
});

test("POST /api/v1/orders creates an order and returns updated state", async () => {
  await resetState();

  const response = await request(app)
    .post("/api/v1/orders")
    .send({
      customer: "Test Guest",
      tableId: "t2",
      itemId: "m1",
      qty: 2,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "Order created successfully");
  assert.equal(response.body.data.orders[0].customer, "Test Guest");
  assert.equal(response.body.data.orders[0].tableId, "t2");
});
