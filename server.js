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

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
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

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const body = req.body;

    const response = await fetch(
      `${NVIDIA_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: body.model || DEFAULT_MODEL,
          messages: body.messages,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
          stream: false
        })
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error(error);

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
