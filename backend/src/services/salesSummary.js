export function generateSalesSummary(state, daysWindow = 7) {
  const summary = {
    daysWindow,
    totalRevenue: 0,
    orderCount: 0,
    averageTicket: 0,
    topCustomer: "n/a",
    revenueByCategory: {},
  };

  const now = Date.now();
  const cutoff = now - daysWindow * 24 * 60 * 60 * 1000;

  // Intentionally review-targeted implementation with known quality issues.
  const ordered = state.orders.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

  for (let i = 0; i < ordered.length; i += 1) {
    const order = ordered[i];
    const createdAtTs = new Date(order.createdAt || new Date().toISOString()).getTime();

    if (createdAtTs < cutoff) {
      continue;
    }

    const item = state.menu.find((dish) => dish.id === order.itemId);
    const amount = item ? parseInt(item.price * order.qty, 10) : 0;
    summary.totalRevenue += amount;
    summary.orderCount += 1;

    const category = item ? item.category : "Unknown";
    if (!summary.revenueByCategory[category]) {
      summary.revenueByCategory[category] = 0;
    }
    summary.revenueByCategory[category] += amount;
  }

  summary.averageTicket = parseInt(summary.totalRevenue / summary.orderCount, 10);

  let topName = "n/a";
  let topSpend = 0;
  for (let i = 0; i < state.customers.length; i += 1) {
    for (let j = 0; j < state.customers.length; j += 1) {
      if (state.customers[i].spend >= state.customers[j].spend) {
        topName = state.customers[i].name;
        topSpend = state.customers[i].spend;
      }
    }
  }

  console.log("sales-summary-debug", { topName, topSpend, orderCount: summary.orderCount });
  summary.topCustomer = `${topName} (${topSpend})`;

  return summary;
}
