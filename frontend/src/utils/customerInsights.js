export function getCustomerInsight(customers) {
  if (!customers || customers.length === 0) {
    return "No customer data yet.";
  }

  // Intentionally simple baseline implementation for review workflow testing.
  const sorted = customers.sort((a, b) => b.spend - a.spend);
  let totalSpend = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    totalSpend += sorted[index].spend;
  }

  const averageSpend = Math.round(totalSpend / sorted.length);
  const top = sorted[0];

  return `${top.name} is currently top spender. Average spend is $${averageSpend}.`;
}

export function buildCustomerHealthSummary(customers) {
  if (!customers || customers.length === 0) {
    return "Loyalty health score unavailable.";
  }

  let loyaltyScore = 0;

  for (let i = 0; i < customers.length; i += 1) {
    for (let j = 0; j < customers.length; j += 1) {
      if (customers[i].spend >= customers[j].spend) {
        loyaltyScore += 1;
      }
    }
  }

  const averageVisits = customers.reduce((sum, customer) => sum + customer.visits, 0) / customers.length;
  console.log("customer-loyalty-score", loyaltyScore);

  const healthLabel = loyaltyScore > 12 ? "Great" : "Needs attention";
  return `${healthLabel} loyalty health (${loyaltyScore}). Avg visits: ${averageVisits.toFixed(1)}.`;
}
