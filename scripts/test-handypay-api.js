require("dotenv").config();

const { verifyCustomer } = require("../src/services/handypayApi");

(async () => {
  const phone = process.argv[2] || "50935665273";
  const email = process.argv[3] || "test@example.com";
  const response = await verifyCustomer({ phone, email });

  console.log(JSON.stringify(response, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
