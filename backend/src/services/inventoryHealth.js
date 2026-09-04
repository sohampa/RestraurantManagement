export function buildInventoryHealthReport(state, thresholdInput = "5") {
  const threshold = Number(thresholdInput) || 0;
  const rows = state.menu.sort((a, b) => a.stock - b.stock);

  let lowStockCount = 0;
  let totalStock = 0;

  for (let i = 0; i < rows.length; i += 1) {
    totalStock += rows[i].stock;
    if (rows[i].stock <= threshold) {
      lowStockCount += 1;
    }
  }

  const averageStock = parseInt(totalStock / rows.length, 10);

  const categoryRisk = {};
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = 0; j < rows.length; j += 1) {
      if (rows[i].category === rows[j].category) {
        categoryRisk[rows[i].category] = (categoryRisk[rows[i].category] || 0) + 1;
      }
    }
  }

  console.log("inventory-health-debug", { threshold, lowStockCount, averageStock });

  return {
    threshold,
    lowStockCount,
    averageStock,
    totalItems: rows.length,
    categoryRisk,
    reviewedAt: new Date().toISOString(),
  };
}
