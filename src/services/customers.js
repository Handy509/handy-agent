const fs = require("fs/promises");
const path = require("path");
const { config } = require("../config");

const CUSTOMERS_FILE = "customers.json";

function normalizePhone(phone = "") {
  return String(phone).replace(/[^\d]/g, "");
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

async function readCustomers() {
  const filePath = path.join(config.dataDir, CUSTOMERS_FILE);

  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeCustomers(customers) {
  await fs.mkdir(config.dataDir, { recursive: true });
  const filePath = path.join(config.dataDir, CUSTOMERS_FILE);
  await fs.writeFile(filePath, JSON.stringify(customers, null, 2), "utf8");
}

async function findCustomerByPhone(phone) {
  const normalized = normalizePhone(phone);
  const customers = await readCustomers();

  return customers.find((customer) => normalizePhone(customer.phone) === normalized) || null;
}

async function upsertCustomer(customer) {
  const customers = await readCustomers();
  const normalized = normalizePhone(customer.phone);
  const existingIndex = customers.findIndex((item) => normalizePhone(item.phone) === normalized);
  const nextCustomer = {
    phone: normalized,
    email: normalizeEmail(customer.email),
    name: customer.name || "",
    balance: customer.balance || "",
    cardStatus: customer.cardStatus || "",
    vip: Boolean(customer.vip),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    customers[existingIndex] = { ...customers[existingIndex], ...nextCustomer };
  } else {
    customers.push({ ...nextCustomer, createdAt: new Date().toISOString() });
  }

  await writeCustomers(customers);
  return nextCustomer;
}

function extractEmail(text = "") {
  return String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

module.exports = {
  extractEmail,
  findCustomerByPhone,
  normalizeEmail,
  normalizePhone,
  upsertCustomer
};
