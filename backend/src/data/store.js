import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const SEED_FILE = path.join(DATA_DIR, "seed.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const STATUS_FLOW = ["Pending", "Preparing", "Served", "Billed"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

async function ensureStateFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STATE_FILE);
  } catch {
    const seed = await readJson(SEED_FILE);
    await writeJson(STATE_FILE, seed);
  }
}

function getOrderAmount(order, menu) {
  const item = menu.find((m) => m.id === order.itemId);
  return item ? item.price * order.qty : 0;
}

function upsertCustomerSpend(customers, name, amount) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = customers.find((customer) => customer.name.toLowerCase() === name.toLowerCase());

  if (!existing) {
    customers.push({ name, visits: 1, lastVisit: today, spend: amount });
    return;
  }

  existing.visits += 1;
  existing.lastVisit = today;
  existing.spend += amount;
}

export async function getState() {
  await ensureStateFile();
  const state = await readJson(STATE_FILE);
  return clone(state);
}

export async function resetState() {
  const seed = await readJson(SEED_FILE);
  await writeJson(STATE_FILE, seed);
  return clone(seed);
}

export async function updateState(mutator) {
  const current = await getState();
  const next = await mutator(current);
  await writeJson(STATE_FILE, next);
  return clone(next);
}

export async function createOrder(payload) {
  return updateState((state) => {
    const newOrder = {
      id: `o${Math.floor(1000 + Math.random() * 9000)}`,
      customer: payload.customer.trim(),
      tableId: payload.tableId,
      itemId: payload.itemId,
      qty: Number(payload.qty),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    state.orders.unshift(newOrder);
    state.tables = state.tables.map((table) =>
      table.id === newOrder.tableId ? { ...table, occupied: true } : table
    );

    const amount = getOrderAmount(newOrder, state.menu);
    upsertCustomerSpend(state.customers, newOrder.customer, amount);
    return state;
  });
}

export async function advanceOrder(orderId) {
  return updateState((state) => {
    let releaseTableId = "";

    state.orders = state.orders.map((order) => {
      if (order.id !== orderId) return order;
      const idx = STATUS_FLOW.indexOf(order.status);
      const nextStatus = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];

      if (nextStatus === "Billed") {
        releaseTableId = order.tableId;
      }

      return { ...order, status: nextStatus };
    });

    if (releaseTableId) {
      state.tables = state.tables.map((table) =>
        table.id === releaseTableId ? { ...table, occupied: false } : table
      );
    }

    return state;
  });
}

export async function deleteOrder(orderId) {
  return updateState((state) => {
    state.orders = state.orders.filter((order) => order.id !== orderId);
    return state;
  });
}

export async function addMenuItem(payload) {
  return updateState((state) => {
    state.menu.push({
      id: `m${Date.now().toString().slice(-6)}`,
      name: payload.name.trim(),
      category: payload.category,
      price: Number(payload.price),
      stock: 25,
      available: true,
    });

    return state;
  });
}

export async function toggleMenuAvailability(dishId) {
  return updateState((state) => {
    state.menu = state.menu.map((dish) =>
      dish.id === dishId ? { ...dish, available: !dish.available } : dish
    );
    return state;
  });
}

export async function decrementMenuStock(dishId) {
  return updateState((state) => {
    state.menu = state.menu.map((dish) =>
      dish.id === dishId ? { ...dish, stock: Math.max(0, dish.stock - 1) } : dish
    );
    return state;
  });
}

export async function removeMenuItem(dishId) {
  return updateState((state) => {
    state.menu = state.menu.filter((dish) => dish.id !== dishId);
    return state;
  });
}

export async function toggleTableOccupancy(tableId) {
  return updateState((state) => {
    state.tables = state.tables.map((table) =>
      table.id === tableId ? { ...table, occupied: !table.occupied } : table
    );
    return state;
  });
}

export async function updateSettings(payload) {
  return updateState((state) => {
    state.settings = {
      restaurantName: payload.restaurantName?.trim() || "ForkFlow Bistro",
      serviceCharge: Number(payload.serviceCharge),
      taxRate: Number(payload.taxRate),
    };

    return state;
  });
}
