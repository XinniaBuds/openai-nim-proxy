from flask import Flask, request, jsonify
import requests
import json

app = Flask(__name__)

NIM_API_KEY = "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"
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
MODEL_NAME = "deepseek-ai/deepseek-v4-pro"

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.json
    
    # Transform OpenAI format to NIM format if needed
    payload = {
        "model": MODEL_NAME,
        "messages": data.get("messages", []),
        "temperature": data.get("temperature", 0.7),
        "max_tokens": data.get("max_tokens", 1024),
        "top_p": data.get("top_p", 0.9)
    }
    
    headers = {
        "Authorization": f"Bearer {NIM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{NIM_BASE_URL}/chat/completions",
            json=payload,
            headers=headers
        )
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
