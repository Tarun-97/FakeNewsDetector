from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os

app = Flask(__name__)

# Configure API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "Enter the api key here"))

model = genai.GenerativeModel("gemini-pro-latest")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_input = request.json.get("message", "")
        if not user_input.strip():
            return jsonify({"reply": "Please enter a message."})

        prompt = f"""You are a Fake News Detection Assistant.
Analyze this statement and tell if it seems fake or true.
Statement: "{user_input}"
Give a short explanation and a credibility score (0–100)."""

        response = model.generate_content(prompt)
        return jsonify({"reply": response.text})

    except Exception as e:
        print("Error:", e)
        return jsonify({"reply": f"Error: {str(e)}"})

if __name__ == "__main__":
    # Get port from environment variable or use 5000 for local
    port = int(os.environ.get("PORT", 5000))
    # debug=True for local, False for production
    debug_mode = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
