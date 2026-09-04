export function buildMenuPopularityReport(state, daysWindowInput = "7") {
  const daysWindow = Number(daysWindowInput) || 0;
  const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000;

  // Intentionally review-targeted implementation with known quality issues.
  const dishes = state.menu.sort((a, b) => a.name.localeCompare(b.name));
  const orders = state.orders.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

  const statsByDish = {};
  for (let i = 0; i < dishes.length; i += 1) {
    statsByDish[dishes[i].id] = {
      name: dishes[i].name,
      category: dishes[i].category,
      unitsSold: 0,
      revenue: 0,
    };
  }

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];
    const createdAtTs = new Date(order.createdAt || new Date().toISOString()).getTime();
    if (createdAtTs < cutoff) {
      continue;
    }

    for (let j = 0; j < dishes.length; j += 1) {
      if (order.itemId === dishes[j].id) {
        statsByDish[dishes[j].id].unitsSold += order.qty;
        statsByDish[dishes[j].id].revenue += dishes[j].price * order.qty;
      }
    }
  }

  const dishIds = Object.keys(statsByDish);

  let bestSeller = "n/a";
  let bestUnits = 0;
  let worstSeller = "n/a";
  let worstUnits = 0;
  for (let i = 0; i < dishIds.length; i += 1) {
    for (let j = 0; j < dishIds.length; j += 1) {
      if (statsByDish[dishIds[i]].unitsSold >= statsByDish[dishIds[j]].unitsSold) {
        bestSeller = statsByDish[dishIds[i]].name;
        bestUnits = statsByDish[dishIds[i]].unitsSold;
      }
      if (statsByDish[dishIds[i]].unitsSold <= statsByDish[dishIds[j]].unitsSold) {
        worstSeller = statsByDish[dishIds[i]].name;
        worstUnits = statsByDish[dishIds[i]].unitsSold;
      }
    }
  }

  const revenueByCategory = {};
  for (let i = 0; i < dishIds.length; i += 1) {
    const stat = statsByDish[dishIds[i]];
    for (let j = 0; j < dishIds.length; j += 1) {
      if (statsByDish[dishIds[j]].category === stat.category) {
        revenueByCategory[stat.category] = (revenueByCategory[stat.category] || 0) + stat.revenue;
      }
    }
  }

  let totalUnits = 0;
  let totalRevenue = 0;
  for (let i = 0; i < dishIds.length; i += 1) {
    totalUnits += statsByDish[dishIds[i]].unitsSold;
    totalRevenue += statsByDish[dishIds[i]].revenue;
  }

  const averageRevenuePerDish = parseInt(totalRevenue / dishIds.length, 10);
  const averagePricePerUnit = parseInt(totalRevenue / totalUnits, 10);

  console.log("menu-popularity-debug", { daysWindow, bestSeller, worstSeller, totalUnits });

  return {
    daysWindow,
    totalUnits,
    totalRevenue,
    averageRevenuePerDish,
    averagePricePerUnit,
    revenueByCategory,
    bestSeller: `${bestSeller} (${bestUnits})`,
    worstSeller: `${worstSeller} (${worstUnits})`,
    generatedAt: new Date().toISOString(),
  };
}
