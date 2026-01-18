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
    'te-IN': { real: 'నిజమైన వార్తలు', fake: 'నకిలీ వార్తలు' },  // Telugu (Nijamaina Vārtalu, Nakilī Vārtalu)
    'ml-IN': { real: 'യഥാർത്ഥ വാർത്ത', fake: 'വ്യാജവാർത്ത' }  // Malayalam (Yathārththa Vārththa, Vyājavārtta)
};
// --------------------------------------------

// Initialize speech recognition
// Initialize speech recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedLanguage; 

    // Fires when the mic actually starts listening
    recognition.onstart = function() {
        console.log("MIC IS ON: Start speaking...");
        isListening = true;
        document.getElementById('voiceBtn').classList.add('listening');
    };

    // Fires when the browser detects you stopped talking
    recognition.onspeechend = function() {
        console.log("Speech stopped: Processing...");
        stopVoice();
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        console.log("Heard text:", transcript);
        document.getElementById('userInput').value = transcript;
        stopVoice();
    };

    recognition.onerror = function(event) {
        console.error('Recognition Error:', event.error);
        if(event.error === 'not-allowed') {
            alert("Mic blocked! Click the 'Lock' icon in the URL bar and 'Allow' the microphone.");
        }
        stopVoice();
    };

    recognition.onend = function() {
        console.log("MIC IS OFF.");
        isListening = false;
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.classList.remove('listening');
    };
}

function toggleVoice() {
    if (!recognition) {
        alert('Speech recognition not supported.');
        return;
    }

    if (isListening) {
        // If already listening, clicking again STOPS it
        console.log("Manual stop requested.");
        recognition.stop(); 
    } else {
        // Start listening
        recognition.lang = selectedLanguage;
        recognition.start();
    }
}

function startVoice() {
    isListening = true;
    document.getElementById('voiceBtn').classList.add('listening');
    recognition.start();
}

function stopVoice() {
    if (!isListening) return; // Important: prevents loops

    isListening = false;
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
    
    // Restore placeholder
    handleLanguageChange(selectedLanguage);

    if (recognition) {
        try {
            recognition.stop(); 
        } catch (e) {
            // Error is ignored if recognition was already stopped by the browser
        }
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
    const ttsToggleWrapper = resultsHeader ? resultsHeader.querySelector('.tts-toggle-wrapper') : null;
    const userInput = document.getElementById('userInput');

    // Stop all active language features
    if (isListening) stopVoice();
    if (ttsSynth.speaking) ttsSynth.cancel();
    const ttsToggle = document.getElementById('ttsToggle');
    if (ttsToggle) ttsToggle.checked = false;

    // Check if the selected language is English
    const isEnglish = langCode === 'en-US';
    
    // 1. Voice and Upload
    if (voiceBtn) voiceBtn.style.display = 'flex';
    if (uploadBtn) uploadBtn.style.display = 'flex';

    // 2. TTS Reader
    if (ttsToggleWrapper) {
        ttsToggleWrapper.style.display = isEnglish ? 'flex' : 'none';
    }

    // 3. Placeholder text
    if (userInput) {
        if (isEnglish) {
            userInput.placeholder = "Type or Paste text here...";
        } else {
            userInput.placeholder = "Type or Paste news text in the selected language...";
        }
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
        const ttsToggle = document.getElementById('ttsToggle');
        if (ttsToggle) ttsToggle.checked = false;
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
    const ttsToggleWrapper = resultsHeader ? resultsHeader.querySelector('.tts-toggle-wrapper') : null;
    const isEnglish = selectedLanguage === 'en-US';

    if (ttsToggleWrapper) {
        ttsToggleWrapper.style.display = isEnglish ? 'flex' : 'none';
    }
    if (resultsHeader) resultsHeader.style.display = 'flex';
    
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


// ***********************************************
// *** CORRECTED FUNCTION WITH SCALING LOGIC ***
// ***********************************************
function parseAIResponse(content) {
    let html = '';
    
    // Regex to split the main content by section headers, keeping the headers for processing.
    const sectionSplitRegex = /(\*\*Analysis:\*\*|\*\*Explanation:\*\*|\*\*Credibility Score:\*\*|Analysis:|Explanation:|Credibility Score:)/;
    const parts = content.split(sectionSplitRegex).filter(p => p.trim().length > 0);
    
    let currentTitle = null;
    let currentContent = '';
    const sections = [];

    // Simple state machine to group content by section
    parts.forEach(part => {
        part = part.trim();
        // Check if the current part is a section header
        if (part.match(sectionSplitRegex)) {
            // If a previous section exists, push it
            if (currentTitle) {
                sections.push({ title: currentTitle, content: currentContent.trim() });
            }
            // Normalize the title for internal comparison
            if (part.includes('Analysis')) currentTitle = 'Analysis';
            else if (part.includes('Explanation')) currentTitle = 'Explanation';
            else if (part.includes('Credibility Score')) currentTitle = 'Credibility Score';
            currentContent = '';
        } else {
            // Append content to the current section
            currentContent += part;
        }
    });
    // Push the last section
    if (currentTitle) {
        sections.push({ title: currentTitle, content: currentContent.trim() });
    } else {
        // Handle case where no specific sections were found (treat as regular text)
        return content.replace(/\n/g, '<br>');
    }
    
    sections.forEach(section => {
        const title = section.title;
        const text = section.content;

        // Check for Analysis section
        if (title === "Analysis") {
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
        else if (title === "Explanation") {
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
        else if (title === "Credibility Score") {
            // Attempt to extract a numerical score (integer or decimal)
            // Regex matches: 5/5, 4.5/5, 0/5
            const scoreMatch = text.match(/(\d+(\.\d+)?)\s*\/\s*5/); 
            // Use parseFloat to handle decimal scores like 4.5
            const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
            
            // *** THE SCALING FORMULA IMPLEMENTATION ***
            // Formula: (score / 5) * 100
            const percentage = Math.min((score / 5) * 100, 100);
            
            let scoreColor = '#ff6b6b'; // Red for low score
            if (score >= 4) scoreColor = '#51cf66'; // Green for high score
            else if (score >= 2) scoreColor = '#ffd43b'; // Yellow for medium score
            
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
        // Fallback for non-recognized content
        else {
            const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--accent-color);">$1</strong>');
            html += `<p style="margin-bottom: 12px; color: var(--text-primary);">${formatted}</p>`;
        }
    });

    return html;
}
// ***********************************************
// *** END OF CORRECTED parseAIResponse FUNCTION ***
// ***********************************************


// --- TTS Functions (No logic change needed) ---

function toggleTtsReader() {
    const ttsToggle = document.getElementById('ttsToggle');
    if (!ttsToggle) return; 

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
    const ttsToggle = document.getElementById('ttsToggle');
    
    if (!explanationElement) {
        console.warn("Explanation text not found for TTS.");
        if (ttsToggle) ttsToggle.checked = false; 
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
            if (ttsToggle) ttsToggle.checked = false;
        };
        
        ttsSynth.speak(ttsUtterance);
    } else {
        console.warn("Explanation section is empty.");
        if (ttsToggle) ttsToggle.checked = false;
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
    if (icon && text) {
        if (savedTheme === 'dark') {
            icon.textContent = '☀️';
            text.textContent = 'Light';
        } else {
            icon.textContent = '🌙';
            text.textContent = 'Dark';
        }
    }

    // Ensure the language selector exists before calling handleLanguageChange
    const selector = document.getElementById('languageSelector');
    if (selector) {
        handleLanguageChange(selector.value);
        // Add event listener for language change
        selector.addEventListener('change', (event) => {
            handleLanguageChange(event.target.value);
        });
    }
    
    // Attach event listener for the analyze button
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeNow);
    }
    
    // Attach event listener for the voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoice);
    }

    // Attach event listener for the image upload button (the '+' button)
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            document.getElementById('imageUpload').click();
        });
    }

    // Attach event listener for the hidden file input
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageSelection);
    }
    
    // Attach event listener for the theme toggle (assuming this is managed elsewhere, 
    // but the function needs to be exposed/called)
    const themeToggleElement = document.getElementById('themeToggle'); // Assuming an ID for a clickable area
    if (themeToggleElement) {
        themeToggleElement.addEventListener('click', toggleTheme);
    }

    // Attach event listener for the TTS toggle
    const ttsToggle = document.getElementById('ttsToggle');
    if (ttsToggle) {
        ttsToggle.addEventListener('change', toggleTtsReader);
    }
});