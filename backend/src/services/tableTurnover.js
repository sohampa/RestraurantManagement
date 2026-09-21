export function buildTableTurnoverReport(state, minutesWindowInput = "120") {
  const minutesWindow = Number(minutesWindowInput) || 0;
  const cutoff = Date.now() - minutesWindow * 60 * 1000;

  // Copy before sorting: report generation must not reorder caller-owned state.
  const tables = [...(state.tables || [])].sort((a, b) => b.capacity - a.capacity);
  const orders = [...(state.orders || [])].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

  let occupiedSeats = 0;
  let totalSeats = 0;

  for (const table of tables) {
    const capacity = Number(table.capacity) || 0;
    totalSeats += capacity;
    if (table.occupied) {
      occupiedSeats += capacity;
    }
  }

  const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  const labelByTableId = new Map(tables.map((table) => [table.id, table.label]));
  const ordersPerTable = {};

  for (const order of orders) {
    const createdAtTs = new Date(order.createdAt || Date.now()).getTime();
    if (!Number.isFinite(createdAtTs) || createdAtTs < cutoff) {
      continue;
    }

    const label = labelByTableId.get(order.tableId);
    if (label === undefined) {
      continue;
    }

    ordersPerTable[label] = (ordersPerTable[label] || 0) + 1;
  }

  // Single pass; ties resolve to the lexicographically smallest label.
  let busiestLabel = null;
  let busiestCount = 0;
  for (const [label, count] of Object.entries(ordersPerTable)) {
    const wins =
      busiestLabel === null ||
      count > busiestCount ||
      (count === busiestCount && label < busiestLabel);

    if (wins) {
      busiestLabel = label;
      busiestCount = count;
    }
  }

  return {
    minutesWindow,
    totalSeats,
    occupiedSeats,
    occupancyRate,
    ordersPerTable,
    busiestTable: `${busiestLabel ?? "n/a"} (${busiestCount})`,
    generatedAt: new Date().toISOString(),
  };
}
