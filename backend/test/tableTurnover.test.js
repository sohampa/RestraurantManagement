import test from "node:test";
import assert from "node:assert/strict";
import { buildTableTurnoverReport } from "../src/services/tableTurnover.js";

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function buildState(overrides = {}) {
  return {
    tables: [
      { id: "t1", label: "T1", capacity: 2, occupied: true },
      { id: "t2", label: "T2", capacity: 4, occupied: false },
      { id: "t3", label: "T3", capacity: 6, occupied: true },
    ],
    orders: [],
    ...overrides,
  };
}

test("returns zeroed occupancy metrics when there are no tables", () => {
  const report = buildTableTurnoverReport({ tables: [], orders: [] });

  assert.equal(report.totalSeats, 0);
  assert.equal(report.occupiedSeats, 0);
  assert.equal(report.occupancyRate, 0);
  assert.equal(Number.isFinite(report.occupancyRate), true);
  assert.equal(report.busiestTable, "n/a (0)");
});

test("tolerates missing tables and orders collections", () => {
  const report = buildTableTurnoverReport({});

  assert.equal(report.totalSeats, 0);
  assert.equal(report.occupancyRate, 0);
  assert.deepEqual(report.ordersPerTable, {});
});

test("does not mutate state.tables or state.orders", () => {
  const state = buildState({
    orders: [
      { id: "o1", tableId: "t1", createdAt: minutesAgo(10) },
      { id: "o2", tableId: "t3", createdAt: minutesAgo(90) },
    ],
  });
  const tablesRef = state.tables;
  const ordersRef = state.orders;
  const tableIdsBefore = state.tables.map((table) => table.id);
  const orderIdsBefore = state.orders.map((order) => order.id);

  buildTableTurnoverReport(state);

  assert.equal(state.tables, tablesRef);
  assert.equal(state.orders, ordersRef);
  assert.deepEqual(state.tables.map((table) => table.id), tableIdsBefore);
  assert.deepEqual(state.orders.map((order) => order.id), orderIdsBefore);
});

test("computes occupancy rate from seat capacity", () => {
  const report = buildTableTurnoverReport(buildState());

  assert.equal(report.totalSeats, 12);
  assert.equal(report.occupiedSeats, 8);
  assert.equal(report.occupancyRate, 67);
});

test("picks the table with the most orders, not the last one seen", () => {
  const state = buildState({
    orders: [
      { id: "o1", tableId: "t1", createdAt: minutesAgo(5) },
      { id: "o2", tableId: "t1", createdAt: minutesAgo(4) },
      { id: "o3", tableId: "t1", createdAt: minutesAgo(3) },
      { id: "o4", tableId: "t3", createdAt: minutesAgo(2) },
    ],
  });

  const report = buildTableTurnoverReport(state);

  assert.deepEqual(report.ordersPerTable, { T1: 3, T3: 1 });
  assert.equal(report.busiestTable, "T1 (3)");
});

test("breaks ties on the lexicographically smallest label", () => {
  const state = buildState({
    orders: [
      { id: "o1", tableId: "t3", createdAt: minutesAgo(5) },
      { id: "o2", tableId: "t1", createdAt: minutesAgo(4) },
    ],
  });

  assert.equal(buildTableTurnoverReport(state).busiestTable, "T1 (1)");
});

test("excludes orders older than the requested window", () => {
  const state = buildState({
    orders: [
      { id: "o1", tableId: "t1", createdAt: minutesAgo(10) },
      { id: "o2", tableId: "t3", createdAt: minutesAgo(600) },
    ],
  });

  const report = buildTableTurnoverReport(state, "120");

  assert.equal(report.minutesWindow, 120);
  assert.deepEqual(report.ordersPerTable, { T1: 1 });
});

test("ignores orders that reference an unknown table", () => {
  const state = buildState({
    orders: [{ id: "o1", tableId: "t404", createdAt: minutesAgo(5) }],
  });

  const report = buildTableTurnoverReport(state);

  assert.deepEqual(report.ordersPerTable, {});
  assert.equal(report.busiestTable, "n/a (0)");
});

test("ignores orders with an unparseable createdAt", () => {
  const state = buildState({
    orders: [{ id: "o1", tableId: "t1", createdAt: "not-a-timestamp" }],
  });

  assert.deepEqual(buildTableTurnoverReport(state).ordersPerTable, {});
});
