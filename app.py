from flask import Flask, render_template, request, jsonify
from google import genai
from google.genai import types
import os
from PIL import Image
import io

pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'

app = Flask(__name__)

# --- Gemini Configuration ---
try:
    client = genai.Client()
except Exception as e:
    print(f"Error initializing Gemini client: {e}")

MODEL_NAME = "gemini-2.5-flash"


@app.route("/")
def index():
    return render_template("index.html")


# --- OCR Route (Gemini Vision - Tesseract Removed) ---
@app.route("/ocr", methods=["POST"])
def ocr_process():
    if not os.getenv("GEMINI_API_KEY"):
        return jsonify({"error": "API Key Error: GEMINI_API_KEY environment variable is not set."}), 500

    if 'image' not in request.files:
        return jsonify({"error": "No image part in the request"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        image = Image.open(io.BytesIO(file.read()))

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                "Extract all readable text from this image. Do not add explanations.",
                image
            ]
        )

        extracted_text = response.text.strip()

        if not extracted_text:
            return jsonify({"error": "No recognizable text found in the image."}), 400

        return jsonify({"text": extracted_text})

    except Exception as e:
        print("Gemini OCR Error:", e)
        return jsonify({"error": f"Error processing image: {str(e)}"}), 500


# --- Chat Route (UNCHANGED) ---
@app.route("/chat", methods=["POST"])
def chat():
    try:
        if not os.getenv("GEMINI_API_KEY"):
            return jsonify({"reply": "API Key Error: GEMINI_API_KEY environment variable is not set."})

        user_input = request.json.get("message", "")
        lang_code = request.json.get("language", "en-US")

        language_name_map = {
            "en-US": "English",
            "hi-IN": "Hindi",
            "kn-IN": "Kannada",
            "ta-IN": "Tamil",
            "te-IN": "Telugu",
            "ml-IN": "Malayalam",
        }
        target_language = language_name_map.get(lang_code, "English")

        if not user_input.strip():
            return jsonify({"reply": "Please enter a statement to analyze."})

        system_instruction = (
            "You are a highly objective Multilingual Fake News Detection Assistant. "
            "Your task is to analyze the provided statement for credibility. "
            "If the input is not in English, translate it internally for analysis. "
            "Use the Google Search tool when available to verify the claim. "
            "The very first line of your response MUST be a machine-readable verdict tag. "
            "Use [VERDICT:REAL] if verified, or [VERDICT:FAKE] if misinformation. "
            "The entire final response after the verdict tag must be written in {target_language}. "
            "Structure the content AFTER the verdict tag using: Analysis, Explanation, Credibility Score."
        )

        prompt = (
            f"Analyze this statement for credibility and fact-check it. "
            f"Ensure the response is in {target_language} and begins with the verdict tag:\n"
            f"\"{user_input}\""
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction.format(
                    target_language=target_language
                ),
                tools=[{"google_search": {}}]
            )
        )

        return jsonify({"reply": response.text})

    except Exception as e:
        print("Chat Error:", e)
        return jsonify({"reply": f"An internal error occurred: {str(e)}"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
