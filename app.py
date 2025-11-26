from flask import Flask, render_template, request, jsonify
from google import genai
from google.genai import types
import os
from PIL import Image
import pytesseract
import io

app = Flask(__name__)

# --- Configuration for the New SDK ---
try:
    # Ensure GEMINI_API_KEY is set in your environment
    client = genai.Client()
except Exception as e:
    print(f"Error initializing Gemini client: {e}")

MODEL_NAME = "gemini-2.5-flash" 

 

@app.route("/")
def index():
    return render_template("index.html")

# --- OCR Route (No Change) ---
@app.route("/ocr", methods=["POST"])
def ocr_process():
    if 'image' not in request.files:
        return jsonify({"error": "No image part in the request"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        try:
            image_data = io.BytesIO(file.read())
            img = Image.open(image_data)
            
            # Perform OCR
            extracted_text = pytesseract.image_to_string(img)
            clean_text = ' '.join(extracted_text.split()).strip()

            if not clean_text:
                 return jsonify({"error": "No recognizable text found in the image."}), 400

            return jsonify({"text": clean_text})
            
        except pytesseract.TesseractNotFoundError:
            return jsonify({
                "error": "Tesseract OCR engine not found. Install Tesseract and/or set the 'pytesseract.pytesseract.tesseract_cmd' path."
            }), 500
        except Exception as e:
            print("OCR Error:", e)
            return jsonify({"error": f"Error processing image: {str(e)}"}), 500

# --- Chat Route (Modified for Reliable Verdict Tag) ---
@app.route("/chat", methods=["POST"])
def chat():
    try:
        if not os.getenv("GEMINI_API_KEY"):
            return jsonify({"reply": "API Key Error: GEMINI_API_KEY environment variable is not set."})

        user_input = request.json.get("message", "")
        lang_code = request.json.get("language", "en-US") 

        # Map language codes to human-readable names for the prompt
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

        # --- MODIFIED SYSTEM INSTRUCTION ---
        system_instruction = (
            "You are a highly objective Multilingual Fake News Detection Assistant. "
            "Your task is to analyze the provided statement for credibility using **real-time search results only**. "
            "**Crucial Step 1:** If the input is not in English, you must translate it to English internally for accurate analysis. "
            "**Crucial Step 2:** Use the Google Search tool to verify the claim. "
            "**Crucial Step 3 (NEW):** The very first line of your response MUST be a machine-readable verdict tag. Use **[VERDICT:REAL]** if the news is true/verified, or **[VERDICT:FAKE]** if it is false/misinformation. Do not translate this tag. "
            "**Crucial Step 4:** The entire final response after the verdict tag, including all section text, must be written in **{target_language}**. "
            "Structure the content AFTER the verdict tag using the sections: **Analysis:**, **Explanation:**, and **Credibility Score:**."
        )
        
        prompt = f"Analyze this statement for credibility and fact-check it. Ensure the entire response is in {target_language} and begins with the required verdict tag: \"{user_input}\""
        
        # --- Configure the API call with Search Grounding Tool ---
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction.format(target_language=target_language), 
                tools=[{"google_search": {}}] 
            )
        )
        
        return jsonify({"reply": response.text})

    except Exception as e:
        print("Error during content generation:", e)
        return jsonify({"reply": f"An internal error occurred: {str(e)}"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)