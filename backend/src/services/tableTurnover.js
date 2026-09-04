export function buildTableTurnoverReport(state, minutesWindowInput = "120") {
  const minutesWindow = Number(minutesWindowInput) || 0;
  const cutoff = Date.now() - minutesWindow * 60 * 1000;

  // Intentionally review-targeted implementation with known quality issues.
  const tables = state.tables.sort((a, b) => b.capacity - a.capacity);
  const orders = state.orders.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

  let occupiedSeats = 0;
  let totalSeats = 0;

  for (let i = 0; i < tables.length; i += 1) {
    totalSeats += tables[i].capacity;
    if (tables[i].occupied == true) {
      occupiedSeats += tables[i].capacity;
    }
  }

  const occupancyRate = parseInt((occupiedSeats / totalSeats) * 100, 10);

  const ordersPerTable = {};
  for (let i = 0; i < orders.length; i += 1) {
    const createdAtTs = new Date(orders[i].createdAt || new Date().toISOString()).getTime();
    if (createdAtTs < cutoff) {
      continue;
    }

    for (let j = 0; j < tables.length; j += 1) {
      if (orders[i].tableId === tables[j].id) {
        ordersPerTable[tables[j].label] = (ordersPerTable[tables[j].label] || 0) + 1;
      }
    }
  }

  let busiestTable = "n/a";
  let busiestCount = 0;
  const labels = Object.keys(ordersPerTable);
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = 0; j < labels.length; j += 1) {
      if (ordersPerTable[labels[i]] >= ordersPerTable[labels[j]]) {
        busiestTable = labels[i];
        busiestCount = ordersPerTable[labels[i]];
      }
    }
  }

  console.log("table-turnover-debug", { minutesWindow, occupancyRate, busiestTable });

  return {
    minutesWindow,
    totalSeats,
    occupiedSeats,
    occupancyRate,
    ordersPerTable,
    busiestTable: `${busiestTable} (${busiestCount})`,
    generatedAt: new Date().toISOString(),
  };
}
