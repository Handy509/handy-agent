require("dotenv").config();

const { generateReply } = require("../src/services/ai");

async function testAnthropic() {
  const reply = await generateReply({
    customerMessage: "Bonjou, mwen vle konnen kijan pou m recharge kat mwen.",
    customerPhone: "test"
  });

  console.log("Anthropic/AI: OK");
  console.log(`Sample reply: ${reply}`);
}

async function testWhatsApp() {
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error("WhatsApp config missing");
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=display_phone_number,verified_name`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  const body = await response.json();

  if (!response.ok) {
    console.log("WhatsApp Graph: FAILED");
    console.log(JSON.stringify({
      status: response.status,
      code: body.error?.code,
      type: body.error?.type,
      message: body.error?.message
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("WhatsApp Graph: OK");
  console.log(JSON.stringify({
    display_phone_number: body.display_phone_number,
    verified_name: body.verified_name,
    id: body.id
  }, null, 2));
}

(async () => {
  await testAnthropic();
  await testWhatsApp();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
