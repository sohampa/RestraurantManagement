export function buildInventoryHealthReport(state, thresholdInput = "5") {
  const threshold = Number(thresholdInput) || 0;
  const menu = state.menu || [];
  const rows = [...menu].sort((a, b) => a.stock - b.stock);

  let lowStockCount = 0;
  let totalStock = 0;
  const categoryRisk = {};

  for (const row of rows) {
    totalStock += row.stock;
    if (row.stock <= threshold) {
      lowStockCount += 1;
      const category = row.category || "Unknown";
      categoryRisk[category] = (categoryRisk[category] || 0) + 1;
    }
  }

  const averageStock = rows.length > 0 ? parseInt(totalStock / rows.length, 10) : 0;

  return {
    threshold,
    lowStockCount,
    averageStock,
    totalItems: rows.length,
    categoryRisk,
    reviewedAt: new Date().toISOString(),
  };
}