let isListening = false;
let recognition = null;
let currentTheme = 'light';
let ttsUtterance = null;
const ttsSynth = window.speechSynthesis;
// --- Global Language State ---
let selectedLanguage = 'en-US'; 
// ---------------------------------

// --- MODIFIED: Translations for the Verdict Badge (Changed 'real' key text) ---
const VERDICT_TRANSLATIONS = {
    // OLD: 'en-US': { real: 'Verified', fake: 'Fake News' },
    'en-US': { real: 'Real News', fake: 'Fake News' },
    'hi-IN': { real: 'सच्ची खबर', fake: 'झूठी खबर' },    // Hindi (Sacchi Khabar, Jhoothi Khabar)
    'kn-IN': { real: 'ನಿಜವಾದ ಸುದ್ದಿ', fake: 'ನಕಲಿ ಸುದ್ದಿ' }, // Kannada (Nijavāda Suddi, Nakali Suddi)
    'ta-IN': { real: 'உண்மையான செய்தி', fake: 'போலியான செய்தி' }, // Tamil (Uṇmaiyāṉa Ceyti, Poliyāṉa Ceyti)
    'te-IN': { real: 'నిజమైన వార్తలు', fake: 'నకిలీ వార్తలు' },   // Telugu (Nijamaina Vārtalu, Nakilī Vārtalu)
    'ml-IN': { real: 'യഥാർത്ഥ വാർത്ത', fake: 'വ്യാജവാർത്ത' }  // Malayalam (Yathārththa Vārththa, Vyājavārtta)
};
// --------------------------------------------

// Initialize speech recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // --- MODIFIED: Use the currently selected language for recognition ---
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedLanguage; 

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('userInput').value = transcript;
        stopVoice();
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        stopVoice();
    };

    recognition.onend = function() {
        stopVoice();
    };
}

function toggleVoice() {
    if (!recognition) {
        alert('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
        return;
    }

    if (isListening) {
        stopVoice();
    } else {
        // --- MODIFIED: Update recognition language before starting ---
        recognition.lang = selectedLanguage;
        startVoice();
    }
}

function startVoice() {
    isListening = true;
    document.getElementById('voiceBtn').classList.add('listening');
    recognition.start();
}

function stopVoice() {
    isListening = false;
    document.getElementById('voiceBtn').classList.remove('listening');
    if (recognition) {
        recognition.stop();
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    
    if (currentTheme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Light';
    } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark';
    }
}

function toggleMenu() {
    const nav = document.getElementById('navMenu');
    nav.classList.toggle('active');
}

// --- Function: Handle Language Selection (No change needed) ---
function handleLanguageChange(langCode) {
    selectedLanguage = langCode;
    const voiceBtn = document.getElementById('voiceBtn');
    const uploadBtn = document.getElementById('uploadBtn'); 
    const resultsHeader = document.getElementById('resultsHeader');
    const ttsToggleWrapper = resultsHeader.querySelector('.tts-toggle-wrapper');
    const userInput = document.getElementById('userInput');

    // Stop all active language features
    if (isListening) stopVoice();
    if (ttsSynth.speaking) ttsSynth.cancel();
    document.getElementById('ttsToggle').checked = false;

    // Check if the selected language is English
    const isEnglish = langCode === 'en-US';
    
    // 1. Voice and Upload
    voiceBtn.style.display = isEnglish ? 'flex' : 'none';
    uploadBtn.style.display = isEnglish ? 'flex' : 'none';

    // 2. TTS Reader
    if (ttsToggleWrapper) {
        ttsToggleWrapper.style.display = isEnglish ? 'flex' : 'none';
    }

    // 3. Placeholder text
    if (isEnglish) {
        userInput.placeholder = "Type or Paste text here...";
    } else {
        userInput.placeholder = "Type or Paste news text in the selected language...";
    }
}
// ---------------------------------------------


async function handleImageSelection() {
    const imageInput = document.getElementById('imageUpload');
    const userInput = document.getElementById('userInput');
    const ocrStatus = document.getElementById('ocrStatus');
    const file = imageInput.files[0];
    const isEnglish = selectedLanguage === 'en-US';

    if (!isEnglish) {
        ocrStatus.textContent = 'Image upload (OCR) is only supported for English.';
        ocrStatus.style.display = 'block';
        return;
    }

    if (!file) {
        ocrStatus.style.display = 'none';
        return;
    }

    ocrStatus.textContent = `Processing image: ${file.name}...`;
    ocrStatus.style.display = 'block';
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/ocr', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        
        if (response.ok) {
            userInput.value = data.text; 
            ocrStatus.textContent = '✅ Text extracted successfully. Click "Analyze Now" to continue.';
        } else {
            userInput.value = '';
            ocrStatus.textContent = `⚠️ OCR Error: ${data.error || 'Failed to extract text.'}`;
        }
    } catch (error) {
        console.error('OCR Fetch Error:', error);
        ocrStatus.textContent = '⚠️ Connection Error: Could not reach the OCR service.';
        userInput.value = '';
    } finally {
        analyzeBtn.disabled = false;
    }
}


async function analyzeNow() {
    // Clear any active TTS and voice input
    if (ttsSynth.speaking) {
        ttsSynth.cancel();
        document.getElementById('ttsToggle').checked = false;
    }
    if (isListening) stopVoice();
    
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) {
        alert('Please enter text to analyze.');
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    btn.textContent = 'Analyzing...';
    
    document.getElementById('ocrStatus').style.display = 'none';
    document.getElementById('resultCard').innerHTML = '';
    document.getElementById('resultsSection').classList.remove('active');

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: message,
                // --- Pass the selected language code to the backend ---
                language: selectedLanguage 
            })
        });

        const data = await response.json();
        displayResult(data.reply);
    } catch (error) {
        console.error('Error:', error);
        displayResult('⚠️ Error connecting to server. Please check if the Flask server is running.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Analyze Now';
    }
}

// --- Function: Reliable Verdict Parsing (No major logic change, uses new text) ---
function displayResult(content) {
    const resultsSection = document.getElementById('resultsSection');
    const resultCard = document.getElementById('resultCard');
    const resultsHeader = document.getElementById('resultsHeader'); 
    
    // --- 1. Determine Verdict and Extract Content ---
    let verdictTag = '';
    let cleanContent = content;

    // Check for the machine-readable verdict tag at the start
    const tagMatch = content.match(/^\[VERDICT:(FAKE|REAL)\]\s*([\s\S]*)/i);

    if (tagMatch) {
        verdictTag = tagMatch[1].toUpperCase(); // 'FAKE' or 'REAL'
        cleanContent = tagMatch[2].trim();      // Content after the tag
    } else {
        // Fallback for unexpected format (treat as generic/error or unverified)
        verdictTag = 'UNKNOWN';
        cleanContent = content;
    }
    
    const isFake = verdictTag === 'FAKE';
    const verdictKey = isFake ? 'fake' : 'real';
    
    // --- 2. Get Translated Badge Text (Uses updated VERDICT_TRANSLATIONS) ---
    const translations = VERDICT_TRANSLATIONS[selectedLanguage] || VERDICT_TRANSLATIONS['en-US'];
    const badgeText = translations[verdictKey] || translations.real; 

    // --- 3. Construct the Badge HTML ---
    const badgeClass = isFake ? 'verdict-fake' : 'verdict-real';
    const badge = `<span class="verdict-badge ${badgeClass}">${isFake ? '⚠️' : '✓'} ${badgeText}</span>`;
    
    // --- 4. Setup UI ---
    const ttsToggleWrapper = resultsHeader.querySelector('.tts-toggle-wrapper');
    const isEnglish = selectedLanguage === 'en-US';

    if (ttsToggleWrapper) {
        ttsToggleWrapper.style.display = isEnglish ? 'flex' : 'none';
    }
    resultsHeader.style.display = 'flex';
    
    // --- 5. Parse Sections and Render ---
    const sectionsHtml = parseAIResponse(cleanContent);
    
    resultCard.innerHTML = `
        <div class="result-header">
            ${badge}
        </div>
        <div class="result-content">
            ${sectionsHtml}
        </div>
    `;
    
    resultsSection.classList.add('active');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


function parseAIResponse(content) {
    let html = '';
    
    const lines = content.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // IMPORTANT: We rely on the AI model to consistently use the English section markers 
        // (**Analysis:**, **Explanation:**, etc.) even when the content is translated.
        // The regex must be robust to catch variations.

        // Check for Analysis section
        if (line.includes('**Analysis:**') || line.startsWith('Analysis:')) {
            const text = line.replace(/\*\*Analysis:\*\*/g, '').replace(/Analysis:/g, '').trim();
            const title = "Analysis"; 
            html += `
                <div style="margin-bottom: 20px;">
                    <div class="explanation-marker" data-section="analysis" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 24px;">🔍</span>
                        <strong style="color: var(--accent-color); font-size: 18px;">${title}</strong>
                    </div>
                    <p class="section-text" style="margin-left: 34px; color: var(--text-primary);">${text}</p>
                </div>
            `;
        }
        // Check for Explanation section
        else if (line.includes('**Explanation:**') || line.startsWith('Explanation:')) {
            const text = line.replace(/\*\*Explanation:\*\*/g, '').replace(/Explanation:/g, '').trim();
            const title = "Explanation";
            html += `
                <div style="margin-bottom: 20px;">
                    <div class="explanation-marker" data-section="explanation" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 24px;">💡</span>
                        <strong style="color: var(--accent-color); font-size: 18px;">${title}</strong>
                    </div>
                    <p class="section-text tts-explanation" style="margin-left: 34px; color: var(--text-primary);">${text}</p>
                </div>
            `;
        }
        // Check for Credibility Score
        else if (line.includes('**Credibility Score:**') || line.includes('Credibility Score:')) {
            const text = line
                .replace(/\*\*Credibility Score:\*\*/g, '')
                .replace(/Credibility Score:/g, '')
                .replace(/\*\*/g, '')
                .trim();

            const title = "Credibility Score";
            // Attempt to extract a percentage number for the progress bar logic
            const scoreMatch = text.match(/(\d+)/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            const percentage = Math.min(score, 100);
            
            let scoreColor = '#ff6b6b';
            if (score >= 4) scoreColor = '#51cf66';
            else if (score >= 2) scoreColor = '#ffd43b';
            
            html += `
                <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid var(--border-color);">
                    <div class="explanation-marker" data-section="score" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <span style="font-size: 24px;">📊</span>
                        <strong style="color: var(--accent-color); font-size: 18px;">${title}</strong>
                    </div>
                    <div style="margin-left: 34px;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                            <div style="font-size: 32px; font-weight: 700; color: ${scoreColor};">${text}</div>
                        </div>
                        <div style="background: var(--input-bg); border-radius: 10px; height: 12px; overflow: hidden;">
                            <div style="background: ${scoreColor}; height: 100%; width: ${percentage}%; border-radius: 10px; transition: width 1s ease;"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        // Regular text/fallback
        else {
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--accent-color);">$1</strong>');
            html += `<p style="margin-bottom: 12px; color: var(--text-primary);">${formatted}</p>`;
        }
    });
    
    return html || content.replace(/\n/g, '<br>');
}


// --- TTS Functions (No logic change needed) ---

function toggleTtsReader() {
    const ttsToggle = document.getElementById('ttsToggle');
    if (ttsToggle.checked) {
        readExplanation();
    } else {
        if (ttsSynth.speaking) {
            ttsSynth.cancel();
        }
    }
}

function readExplanation() {
    const explanationElement = document.querySelector('.tts-explanation');
    
    if (!explanationElement) {
        console.warn("Explanation text not found for TTS.");
        document.getElementById('ttsToggle').checked = false; 
        return;
    }

    const textToSpeak = explanationElement.textContent.trim();

    if (textToSpeak) {
        if (ttsSynth.speaking) {
            ttsSynth.cancel();
        }
        
        ttsUtterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Set the language for TTS based on selection (if available in browser)
        ttsUtterance.lang = selectedLanguage; 

        ttsUtterance.onend = () => {
            document.getElementById('ttsToggle').checked = false;
        };
        
        ttsSynth.speak(ttsUtterance);
    } else {
        console.warn("Explanation section is empty.");
        document.getElementById('ttsToggle').checked = false;
    }
}
// -------------------------

// --- Initialize state on load ---
document.addEventListener('DOMContentLoaded', () => {
    // Set the theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    currentTheme = savedTheme;
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (savedTheme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Light';
    } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark';
    }

    // Ensure the language selector exists before calling handleLanguageChange
    const selector = document.getElementById('languageSelector');
    if (selector) {
        handleLanguageChange(selector.value);
    }
});