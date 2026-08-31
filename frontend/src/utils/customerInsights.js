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
