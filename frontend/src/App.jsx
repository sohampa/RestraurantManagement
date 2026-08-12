import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:30000/api/v1";
const EMPTY_STATE = {
  settings: { restaurantName: "ForkFlow", serviceCharge: 5, taxRate: 8 },
  menu: [],
  tables: [],
  orders: [],
  customers: [],
};

const sectionMeta = {
  dashboard: { title: "Dashboard", subtitle: "Overview of your restaurant operations." },
  orders: { title: "Orders", subtitle: "Create and track customer orders in real time." },
  menu: { title: "Menu", subtitle: "Manage dishes, pricing, and stock levels." },
  tables: { title: "Tables", subtitle: "Monitor table occupancy and capacity." },
  customers: { title: "Customers", subtitle: "Keep an eye on guest history and loyalty tiers." },
  reports: { title: "Reports", subtitle: "Analyze sales performance and category trends." },
  settings: { title: "Settings", subtitle: "Configure billing rates and app behavior." },
};

const navItems = [
  { key: "dashboard", icon: "bi-speedometer2", label: "Dashboard" },
  { key: "orders", icon: "bi-receipt-cutoff", label: "Orders" },
  { key: "menu", icon: "bi-journal-text", label: "Menu" },
  { key: "tables", icon: "bi-grid-3x3-gap", label: "Tables" },
  { key: "customers", icon: "bi-people", label: "Customers" },
  { key: "reports", icon: "bi-graph-up-arrow", label: "Reports" },
  { key: "settings", icon: "bi-sliders2", label: "Settings" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTier(spend) {
  if (spend > 450) return "Platinum";
  if (spend > 250) return "Gold";
  if (spend > 120) return "Silver";
  return "Bronze";
}

function statusBadge(status) {
  if (status === "Pending") return <span className="badge badge-status text-bg-secondary">Pending</span>;
  if (status === "Preparing") return <span className="badge badge-status text-bg-warning">Preparing</span>;
  if (status === "Served") return <span className="badge badge-status text-bg-info">Served</span>;
  return <span className="badge badge-status text-bg-success">Billed</span>;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

function App() {
  const [state, setState] = useState(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  const [orderDraft, setOrderDraft] = useState({ customer: "", tableId: "", itemId: "", qty: 1 });
  const [menuDraft, setMenuDraft] = useState({ name: "", category: "Starter", price: "" });
  const [settingsDraft, setSettingsDraft] = useState(state.settings);

  useEffect(() => {
    document.title = `${state.settings.restaurantName} | ForkFlow`;
  }, [state]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const payload = await apiRequest("/state");
        setState(payload.data);
      } catch {
        notify("Unable to connect backend API");
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    setSettingsDraft(state.settings);
  }, [state.settings]);

  useEffect(() => {
    const availableTables = state.tables;
    const firstAvailableMenu = state.menu.find((dish) => dish.available);

    setOrderDraft((prev) => ({
      ...prev,
      tableId: prev.tableId || (availableTables[0] ? availableTables[0].id : ""),
      itemId: prev.itemId || (firstAvailableMenu ? firstAvailableMenu.id : ""),
    }));
  }, [state.tables, state.menu]);

  useEffect(() => {
    if (!showToast) return undefined;
    const timer = setTimeout(() => setShowToast(false), 1800);
    return () => clearTimeout(timer);
  }, [showToast]);

  function notify(message) {
    setToastMessage(message);
    setShowToast(true);
  }

  async function runApiAction(path, options = {}, fallbackMessage = "Saved") {
    try {
      const payload = await apiRequest(path, options);
      setState(payload.data);
      notify(payload.message || fallbackMessage);
      return true;
    } catch (error) {
      notify(error.message || "Action failed");
      return false;
    }
  }

  function getOrderAmount(order, menu = state.menu) {
    const item = menu.find((m) => m.id === order.itemId);
    return item ? item.price * order.qty : 0;
  }

  const billedRevenue = useMemo(
    () =>
      state.orders
        .filter((order) => order.status === "Billed")
        .reduce((sum, order) => sum + getOrderAmount(order), 0),
    [state.orders, state.menu]
  );

  const occupiedTables = useMemo(() => state.tables.filter((table) => table.occupied).length, [state.tables]);
  const availableMenuItems = useMemo(() => state.menu.filter((dish) => dish.available).length, [state.menu]);

  const topItems = useMemo(() => {
    const soldCounter = {};

    state.orders.forEach((order) => {
      soldCounter[order.itemId] = (soldCounter[order.itemId] || 0) + order.qty;
    });

    return Object.entries(soldCounter)
      .map(([itemId, qty]) => {
        const item = state.menu.find((m) => m.id === itemId);
        return { name: item ? item.name : "Unknown", qty };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [state.orders, state.menu]);

  const kitchenLoadData = useMemo(() => {
    const activeOrders = state.orders.filter((order) => order.status === "Pending" || order.status === "Preparing").length;
    const load = Math.min(100, Math.round((activeOrders / Math.max(1, state.tables.length)) * 100 + 20));
    let mood = "Light";

    if (load > 45) mood = "Moderate";
    if (load > 70) mood = "High";

    let badgeClass = "text-bg-success";
    if (mood === "Moderate") badgeClass = "text-bg-warning";
    if (mood === "High") badgeClass = "text-bg-danger";

    return { load, mood, badgeClass };
  }, [state.orders, state.tables]);

  const reports = useMemo(() => {
    const grossSales = state.orders.reduce((sum, order) => sum + getOrderAmount(order), 0);
    const serviceAmount = (grossSales * state.settings.serviceCharge) / 100;
    const taxAmount = ((grossSales + serviceAmount) * state.settings.taxRate) / 100;
    const netSales = grossSales + serviceAmount + taxAmount;

    const categorySales = {};
    state.orders.forEach((order) => {
      const item = state.menu.find((m) => m.id === order.itemId);
      if (!item) return;
      categorySales[item.category] = (categorySales[item.category] || 0) + getOrderAmount(order);
    });

    return {
      rows: [
        ["Gross Sales", formatCurrency(grossSales)],
        [`Service Charge (${state.settings.serviceCharge}%)`, formatCurrency(serviceAmount)],
        [`Tax (${state.settings.taxRate}%)`, formatCurrency(taxAmount)],
        ["Net Sales", formatCurrency(netSales)],
        ["Total Orders", state.orders.length],
        ["Billed Orders", state.orders.filter((o) => o.status === "Billed").length],
      ],
      categorySales,
    };
  }, [state.orders, state.menu, state.settings]);

  async function handleCreateOrder(event) {
    event.preventDefault();
    if (!orderDraft.customer.trim() || !orderDraft.tableId || !orderDraft.itemId || Number(orderDraft.qty) < 1) {
      return;
    }

    const ok = await runApiAction(
      "/orders",
      {
        method: "POST",
        body: JSON.stringify({
          customer: orderDraft.customer,
          tableId: orderDraft.tableId,
          itemId: orderDraft.itemId,
          qty: Number(orderDraft.qty),
        }),
      },
      "Order created successfully"
    );

    if (ok) {
      setOrderDraft((prev) => ({ ...prev, customer: "", qty: 1 }));
    }
  }

  async function handleAddMenuItem(event) {
    event.preventDefault();
    if (!menuDraft.name.trim() || Number(menuDraft.price) <= 0) {
      return;
    }

    const ok = await runApiAction(
      "/menu",
      {
        method: "POST",
        body: JSON.stringify({
          name: menuDraft.name,
          category: menuDraft.category,
          price: Number(menuDraft.price),
        }),
      },
      "New dish added to menu"
    );

    if (ok) {
      setMenuDraft({ name: "", category: "Starter", price: "" });
    }
  }

  async function advanceOrder(orderId) {
    await runApiAction(`/orders/${orderId}/advance`, { method: "PATCH" }, `Order ${orderId} advanced`);
  }

  async function deleteOrder(orderId) {
    await runApiAction(`/orders/${orderId}`, { method: "DELETE" }, `Order ${orderId} deleted`);
  }

  async function toggleDishAvailability(dishId) {
    await runApiAction(`/menu/${dishId}/toggle-availability`, { method: "PATCH" }, "Dish availability updated");
  }

  async function useDishStock(dishId) {
    await runApiAction(`/menu/${dishId}/decrement-stock`, { method: "PATCH" }, "Dish stock reduced");
  }

  async function removeDish(dishId) {
    await runApiAction(`/menu/${dishId}`, { method: "DELETE" }, "Dish removed from menu");
  }

  async function toggleTable(tableId) {
    await runApiAction(`/tables/${tableId}/toggle-occupancy`, { method: "PATCH" }, "Table occupancy updated");
  }

  async function saveSettings(event) {
    event.preventDefault();

    await runApiAction(
      "/settings",
      {
        method: "PUT",
        body: JSON.stringify({
          restaurantName: settingsDraft.restaurantName,
          serviceCharge: Number(settingsDraft.serviceCharge),
          taxRate: Number(settingsDraft.taxRate),
        }),
      },
      "Settings saved"
    );
  }

  async function clearLocalData() {
    await runApiAction("/state/reset", { method: "POST" }, "Local data cleared and reset");
  }

  async function resetDemoData() {
    await runApiAction("/state/reset", { method: "POST" }, "Demo data restored");
  }

  function openOrdersFromModal() {
    setActiveSection("orders");
    setQuickOrderOpen(false);
  }

  const section = sectionMeta[activeSection];

  if (isLoading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <div className="panel text-center">
          <h2 className="h5 mb-2">Loading ForkFlow</h2>
          <p className="text-secondary mb-0">Connecting frontend to backend service...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-bg-shape app-bg-shape-1" />
      <div className="app-bg-shape app-bg-shape-2" />

      <div className="container-fluid p-0">
        <div className="row g-0 min-vh-100">
          <aside className="col-12 col-lg-3 col-xl-2 sidebar-wrap">
            <div className="sidebar d-flex flex-column">
              <div className="brand-box">
                <p className="text-uppercase mb-1 brand-eyebrow">Restaurant OS</p>
                <h1 className="h4 mb-0 brand-title">ForkFlow</h1>
              </div>

              <nav className="nav flex-column mt-4" aria-label="Main Navigation">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    className={`nav-link ${activeSection === item.key ? "active" : ""}`}
                    onClick={() => setActiveSection(item.key)}
                    type="button"
                  >
                    <i className={`bi ${item.icon}`} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto status-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-secondary">Kitchen Load</span>
                  <span className={`badge rounded-pill ${kitchenLoadData.badgeClass}`}>{kitchenLoadData.mood}</span>
                </div>
                <div className="progress" aria-label="Kitchen Load">
                  <div className="progress-bar" style={{ width: `${kitchenLoadData.load}%` }} />
                </div>
              </div>
            </div>
          </aside>

          <main className="col-12 col-lg-9 col-xl-10 content-wrap">
            <header className="topbar d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h2 className="mb-1 page-title">{section.title}</h2>
                <p className="mb-0 text-secondary">{section.subtitle}</p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-light btn-soft" type="button" onClick={resetDemoData}>
                  <i className="bi bi-arrow-repeat" /> Reset Demo Data
                </button>
                <button className="btn btn-primary" type="button" onClick={() => setQuickOrderOpen(true)}>
                  <i className="bi bi-plus-circle" /> Quick Order
                </button>
              </div>
            </header>

            <div className="release-banner" role="status" aria-live="polite">
              <span className="release-badge">UI Refresh</span>
              <span className="release-text">Enhanced visual marker for the current release branch.</span>
            </div>

            {activeSection === "dashboard" && (
              <section className="app-section active">
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-6 col-xl-3">
                    <article className="kpi-card">
                      <div>
                        <p className="text-secondary mb-1">Revenue (Billed)</p>
                        <div className="kpi-value">{formatCurrency(billedRevenue)}</div>
                      </div>
                      <span className="kpi-chip">Today</span>
                    </article>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <article className="kpi-card">
                      <div>
                        <p className="text-secondary mb-1">Active Orders</p>
                        <div className="kpi-value">{state.orders.filter((o) => o.status !== "Billed").length}</div>
                      </div>
                      <span className="kpi-chip">Live</span>
                    </article>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <article className="kpi-card">
                      <div>
                        <p className="text-secondary mb-1">Occupied Tables</p>
                        <div className="kpi-value">{occupiedTables}/{state.tables.length}</div>
                      </div>
                      <span className="kpi-chip">Floor</span>
                    </article>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <article className="kpi-card">
                      <div>
                        <p className="text-secondary mb-1">Available Dishes</p>
                        <div className="kpi-value">{availableMenuItems}</div>
                      </div>
                      <span className="kpi-chip">Kitchen</span>
                    </article>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-xxl-7">
                    <div className="panel h-100">
                      <div className="panel-head d-flex justify-content-between align-items-center">
                        <h3 className="h6 mb-0">Live Order Queue</h3>
                        <span className="small text-secondary">Realtime simulation</span>
                      </div>
                      <div className="table-responsive">
                        <table className="table align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Token</th>
                              <th>Table</th>
                              <th>Items</th>
                              <th>Status</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.orders.slice(0, 6).map((order) => {
                              const table = state.tables.find((t) => t.id === order.tableId);
                              const item = state.menu.find((m) => m.id === order.itemId);

                              return (
                                <tr key={order.id}>
                                  <td>#{order.id}</td>
                                  <td>{table ? table.label : "-"}</td>
                                  <td>{item ? item.name : "Unknown"}</td>
                                  <td>{statusBadge(order.status)}</td>
                                  <td>{formatCurrency(getOrderAmount(order))}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-xxl-5">
                    <div className="panel h-100">
                      <div className="panel-head d-flex justify-content-between align-items-center">
                        <h3 className="h6 mb-0">Top Selling Dishes</h3>
                        <span className="small text-secondary">Today</span>
                      </div>
                      <div className="stack-list">
                        {topItems.map((entry, index) => (
                          <div key={`${entry.name}-${index}`} className="stack-item">
                            <div>
                              <div className="fw-semibold">{index + 1}. {entry.name}</div>
                              <small className="text-secondary">Popular item</small>
                            </div>
                            <span className="badge text-bg-dark">{entry.qty} sold</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "orders" && (
              <section className="app-section active">
                <div className="panel mb-3">
                  <form className="row g-2" onSubmit={handleCreateOrder}>
                    <div className="col-md-3">
                      <label className="form-label" htmlFor="orderCustomer">Customer</label>
                      <input
                        id="orderCustomer"
                        type="text"
                        className="form-control"
                        value={orderDraft.customer}
                        onChange={(event) => setOrderDraft((prev) => ({ ...prev, customer: event.target.value }))}
                        placeholder="Guest name"
                        required
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label" htmlFor="orderTable">Table</label>
                      <select
                        id="orderTable"
                        className="form-select"
                        value={orderDraft.tableId}
                        onChange={(event) => setOrderDraft((prev) => ({ ...prev, tableId: event.target.value }))}
                        required
                      >
                        {state.tables.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.label} (Cap {table.capacity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" htmlFor="orderItem">Menu Item</label>
                      <select
                        id="orderItem"
                        className="form-select"
                        value={orderDraft.itemId}
                        onChange={(event) => setOrderDraft((prev) => ({ ...prev, itemId: event.target.value }))}
                        required
                      >
                        {state.menu
                          .filter((dish) => dish.available)
                          .map((dish) => (
                            <option key={dish.id} value={dish.id}>
                              {dish.name} - {formatCurrency(dish.price)}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label" htmlFor="orderQty">Qty</label>
                      <input
                        id="orderQty"
                        type="number"
                        min="1"
                        value={orderDraft.qty}
                        className="form-control"
                        onChange={(event) => setOrderDraft((prev) => ({ ...prev, qty: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-2 d-grid">
                      <label className="form-label opacity-0" htmlFor="createOrderBtn">Create</label>
                      <button className="btn btn-primary" type="submit">
                        <span id="createOrderBtn" className="visually-hidden">Create order</span>
                        <i className="bi bi-cart-plus" /> Add Order
                      </button>
                    </div>
                  </form>
                </div>

                <div className="panel">
                  <div className="panel-head d-flex justify-content-between align-items-center">
                    <h3 className="h6 mb-0">Active Orders</h3>
                    <small className="text-secondary">Track preparation and billing status</small>
                  </div>
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Customer</th>
                          <th>Table</th>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Status</th>
                          <th>Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.orders.map((order) => {
                          const table = state.tables.find((t) => t.id === order.tableId);
                          const item = state.menu.find((m) => m.id === order.itemId);

                          return (
                            <tr key={order.id}>
                              <td>#{order.id}</td>
                              <td>{order.customer}</td>
                              <td>{table ? table.label : "-"}</td>
                              <td>{item ? item.name : "Unknown"}</td>
                              <td>{order.qty}</td>
                              <td>{statusBadge(order.status)}</td>
                              <td>{formatCurrency(getOrderAmount(order))}</td>
                              <td className="d-flex gap-1">
                                <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => advanceOrder(order.id)}>
                                  Next
                                </button>
                                <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => deleteOrder(order.id)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "menu" && (
              <section className="app-section active">
                <div className="row g-3">
                  <div className="col-12 col-xl-4">
                    <div className="panel h-100">
                      <h3 className="h6">Add Menu Item</h3>
                      <form className="row g-2" onSubmit={handleAddMenuItem}>
                        <div className="col-12">
                          <label className="form-label" htmlFor="menuName">Dish Name</label>
                          <input
                            id="menuName"
                            type="text"
                            className="form-control"
                            value={menuDraft.name}
                            onChange={(event) => setMenuDraft((prev) => ({ ...prev, name: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label" htmlFor="menuCategory">Category</label>
                          <select
                            id="menuCategory"
                            className="form-select"
                            value={menuDraft.category}
                            onChange={(event) => setMenuDraft((prev) => ({ ...prev, category: event.target.value }))}
                            required
                          >
                            <option>Starter</option>
                            <option>Main Course</option>
                            <option>Dessert</option>
                            <option>Beverage</option>
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label" htmlFor="menuPrice">Price ($)</label>
                          <input
                            id="menuPrice"
                            type="number"
                            min="1"
                            className="form-control"
                            value={menuDraft.price}
                            onChange={(event) => setMenuDraft((prev) => ({ ...prev, price: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="col-12 d-grid">
                          <button className="btn btn-dark" type="submit">
                            <i className="bi bi-plus-lg" /> Save Dish
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="col-12 col-xl-8">
                    <div className="panel h-100">
                      <div className="panel-head d-flex justify-content-between align-items-center">
                        <h3 className="h6 mb-0">Menu and Inventory</h3>
                        <small className="text-secondary">Edit stock and availability</small>
                      </div>
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Dish</th>
                              <th>Category</th>
                              <th>Price</th>
                              <th>Stock</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.menu.map((dish) => (
                              <tr key={dish.id}>
                                <td>{dish.name}</td>
                                <td>{dish.category}</td>
                                <td>{formatCurrency(dish.price)}</td>
                                <td>{dish.stock}</td>
                                <td>
                                  {dish.available ? (
                                    <span className="badge text-bg-success">Available</span>
                                  ) : (
                                    <span className="badge text-bg-secondary">Unavailable</span>
                                  )}
                                </td>
                                <td className="d-flex gap-1">
                                  <button className="btn btn-sm btn-outline-dark" type="button" onClick={() => useDishStock(dish.id)}>
                                    Use 1
                                  </button>
                                  <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => toggleDishAvailability(dish.id)}>
                                    {dish.available ? "Disable" : "Enable"}
                                  </button>
                                  <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removeDish(dish.id)}>
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "tables" && (
              <section className="app-section active">
                <div className="row g-3">
                  {state.tables.map((table) => (
                    <div key={table.id} className="col-12 col-sm-6 col-xl-4 col-xxl-3">
                      <article className="table-card">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h4>{table.label}</h4>
                          <span className={`table-status badge ${table.occupied ? "text-bg-danger" : "text-bg-success"}`}>
                            {table.occupied ? "Occupied" : "Available"}
                          </span>
                        </div>
                        <p className="text-secondary mb-3">Capacity: {table.capacity} guests</p>
                        <button
                          className={`btn btn-sm ${table.occupied ? "btn-outline-success" : "btn-outline-danger"}`}
                          type="button"
                          onClick={() => toggleTable(table.id)}
                        >
                          Mark as {table.occupied ? "Available" : "Occupied"}
                        </button>
                      </article>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeSection === "customers" && (
              <section className="app-section active">
                <div className="panel">
                  <div className="panel-head d-flex justify-content-between align-items-center">
                    <h3 className="h6 mb-0">Customer Ledger</h3>
                    <small className="text-secondary">Frequent guests and spend summary</small>
                  </div>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Visits</th>
                          <th>Last Visit</th>
                          <th>Total Spend</th>
                          <th>Tier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.customers.map((customer) => (
                          <tr key={customer.name}>
                            <td>{customer.name}</td>
                            <td>{customer.visits}</td>
                            <td>{customer.lastVisit}</td>
                            <td>{formatCurrency(customer.spend)}</td>
                            <td>{getTier(customer.spend)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "reports" && (
              <section className="app-section active">
                <div className="row g-3">
                  <div className="col-12 col-xl-6">
                    <div className="panel h-100">
                      <h3 className="h6">Daily Snapshot</h3>
                      <ul className="list-group list-group-flush">
                        {reports.rows.map(([label, value]) => (
                          <li key={label} className="list-group-item d-flex justify-content-between px-0 bg-transparent border-bottom">
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="col-12 col-xl-6">
                    <div className="panel h-100">
                      <h3 className="h6">Category Performance</h3>
                      <div className="stack-list">
                        {Object.entries(reports.categorySales).map(([category, amount]) => (
                          <div key={category} className="stack-item">
                            <span>{category}</span>
                            <span className="badge text-bg-light">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "settings" && (
              <section className="app-section active">
                <div className="panel">
                  <h3 className="h6">Application Settings</h3>
                  <form className="row g-3" onSubmit={saveSettings}>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="restaurantName">Restaurant Name</label>
                      <input
                        id="restaurantName"
                        type="text"
                        className="form-control"
                        value={settingsDraft.restaurantName}
                        onChange={(event) => setSettingsDraft((prev) => ({ ...prev, restaurantName: event.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="serviceCharge">Service Charge (%)</label>
                      <input
                        id="serviceCharge"
                        type="number"
                        min="0"
                        max="20"
                        className="form-control"
                        value={settingsDraft.serviceCharge}
                        onChange={(event) => setSettingsDraft((prev) => ({ ...prev, serviceCharge: event.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="taxRate">Tax (%)</label>
                      <input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="25"
                        className="form-control"
                        value={settingsDraft.taxRate}
                        onChange={(event) => setSettingsDraft((prev) => ({ ...prev, taxRate: event.target.value }))}
                      />
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button type="submit" className="btn btn-primary">Save Settings</button>
                      <button type="button" className="btn btn-outline-secondary" onClick={clearLocalData}>Clear Local Data</button>
                    </div>
                  </form>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {quickOrderOpen && (
        <dialog className="modal-fallback" open aria-labelledby="quickOrderTitle">
          <button type="button" className="modal-fallback-backdrop" aria-label="Close quick order modal" onClick={() => setQuickOrderOpen(false)} />
          <div className="modal-fallback-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h4 id="quickOrderTitle" className="modal-title h6">Quick Order Wizard</h4>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setQuickOrderOpen(false)} />
              </div>
              <div className="modal-body">
                <p className="text-secondary mb-2">Jump straight into the order workflow.</p>
                <button className="btn btn-primary w-100" type="button" onClick={openOrdersFromModal}>
                  Create New Order
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      <div className="toast-container position-fixed top-0 end-0 p-3">
        <div className={`toast align-items-center text-bg-dark border-0 ${showToast ? "show" : "hide"}`} role="status" aria-live="polite" aria-atomic="true">
          <div className="d-flex">
            <div className="toast-body">{toastMessage}</div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={() => setShowToast(false)} />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
