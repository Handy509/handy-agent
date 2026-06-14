const { upsertCustomer } = require("../src/services/customers");

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
}

(async () => {
  const phone = readArg("phone");
  const email = readArg("email");

  if (!phone || !email) {
    console.error("Usage: node scripts/add-customer.js --phone 50935665273 --email client@example.com --name \"Client\" --balance \"$12.50\" --vip true");
    process.exit(1);
  }

  const customer = await upsertCustomer({
    phone,
    email,
    name: readArg("name"),
    balance: readArg("balance"),
    cardStatus: readArg("card-status"),
    vip: readArg("vip") === "true"
  });

  console.log(JSON.stringify({
    ok: true,
    phone: customer.phone,
    email: customer.email,
    name: customer.name,
    balance: customer.balance,
    vip: customer.vip
  }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
