require("dotenv").config();

(async () => {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    }
  });

  const body = await response.json();
  console.log(`status ${response.status}`);
  if (Array.isArray(body.data)) {
    console.log(body.data.map((model) => model.id).join("\n"));
  } else {
    console.log(JSON.stringify(body, null, 2));
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
