import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

// Hosted NVIDIA API
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

const DEFAULT_MODEL = "deepseek-ai/deepseek-v4-pro";

console.log("API key loaded:", !!NVIDIA_API_KEY);

app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    apiKeyLoaded: !!NVIDIA_API_KEY
  });
});

app.get("/v1/models", (_, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: DEFAULT_MODEL,
        object: "model",
        owned_by: "nvidia"
      }
    ]
  });
});

app.get("/test", async (_, res) => {
  try {
    const response = await fetch(
      `${NVIDIA_BASE_URL}/models`,
      {
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`
        }
      }
    );

    const text = await response.text();

    console.log("TEST STATUS:", response.status);
    console.log("TEST RESPONSE:", text);

    res.status(response.status).send(text);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const body = req.body;

    const payload = {
      model: body.model || DEFAULT_MODEL,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      stream: false
    };

    console.log("REQUEST MODEL:", payload.model);

    const response = await fetch(
      `${NVIDIA_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const text = await response.text();

    console.log("NVIDIA STATUS:", response.status);
    console.log("NVIDIA RESPONSE:", text);

    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch {
      return res.status(response.status).send(text);
    }
  } catch (error) {
    console.error("SERVER ERROR:", error);

    return res.status(500).json({
      error: {
        message: error.message
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
