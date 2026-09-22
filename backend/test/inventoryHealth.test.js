import test from "node:test";
import assert from "node:assert/strict";
import { buildInventoryHealthReport } from "../src/services/inventoryHealth.js";

function buildState(menu = []) {
  return { menu, tables: [], orders: [], customers: [] };
}

const defaultMenu = [
  { id: "m1", category: "Main Course", stock: 14 },
  { id: "m2", category: "Main Course", stock: 17 },
  { id: "m3", category: "Dessert", stock: 11 },
  { id: "m4", category: "Beverage", stock: 40 },
];

test("does not mutate state.menu ordering", () => {
  const state = buildState(defaultMenu);
  const menuRef = state.menu;
  const idsBefore = state.menu.map((item) => item.id);

  buildInventoryHealthReport(state, "20");

  assert.equal(state.menu, menuRef);
  assert.deepEqual(state.menu.map((item) => item.id), idsBefore);
});

test("returns categoryRisk as low-stock count per category", () => {
  const report = buildInventoryHealthReport(buildState(defaultMenu), "20");

  assert.deepEqual(report.categoryRisk, { "Main Course": 2, Dessert: 1 });
});

test("does not inflate categoryRisk by pair counting", () => {
  const state = buildState([
    { id: "m1", category: "Starter", stock: 2 },
    { id: "m2", category: "Starter", stock: 3 },
  ]);

  const report = buildInventoryHealthReport(state, "5");

  assert.deepEqual(report.categoryRisk, { Starter: 2 });
});

test("computes lowStockCount, averageStock and totalItems", () => {
  const report = buildInventoryHealthReport(buildState(defaultMenu), "20");

  assert.equal(report.totalItems, 4);
  assert.equal(report.lowStockCount, 3);
  assert.equal(report.averageStock, parseInt((14 + 17 + 11 + 40) / 4, 10));
});

test("defaults threshold to 5 when input is omitted", () => {
  const report = buildInventoryHealthReport(buildState(defaultMenu));

  assert.equal(report.threshold, 5);
});

test("handles empty menu without NaN", () => {
  const report = buildInventoryHealthReport(buildState([]), "5");

  assert.equal(report.totalItems, 0);
  assert.equal(report.averageStock, 0);
  assert.equal(report.lowStockCount, 0);
  assert.deepEqual(report.categoryRisk, {});
});

test("tolerates a missing menu collection", () => {
  const report = buildInventoryHealthReport({}, "5");

  assert.equal(report.totalItems, 0);
  assert.equal(report.averageStock, 0);
  assert.deepEqual(report.categoryRisk, {});
});