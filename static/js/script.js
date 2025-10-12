let isListening = false;
let recognition = null;
let currentTheme = 'light';

// Initialize speech recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

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

async function analyzeNow() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) {
        alert('Please enter a URL or text to analyze');
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    btn.textContent = 'Analyzing...';

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
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

function displayResult(content) {
    const resultsSection = document.getElementById('resultsSection');
    const resultCard = document.getElementById('resultCard');
    
    // Determine if fake or real based on content
    const isFake = content.toLowerCase().includes('fake') || 
                  content.toLowerCase().includes('false') ||
                  content.toLowerCase().includes('misinformation');
    
    const badge = isFake ? 
        '<span class="verdict-badge verdict-fake">⚠️ Fake News</span>' :
        '<span class="verdict-badge verdict-real">✓ Verified</span>';
    
    // Parse the content to extract sections
    const sections = parseAIResponse(content);
    
    resultCard.innerHTML = `
        <div class="result-header">
            ${badge}
        </div>
        <div class="result-content">
            ${sections}
        </div>
    `;
    
    resultsSection.classList.add('active');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function parseAIResponse(content) {
    let html = '';
    
    // Split by common patterns
    const lines = content.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // Check for Analysis section
        if (line.includes('**Analysis:**') || line.startsWith('Analysis:')) {
            const text = line.replace(/\*\*Analysis:\*\*/g, '').replace(/Analysis:/g, '').trim();
            html += `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 24px;">🔍</span>
                        <strong style="color: var(--accent-color); font-size: 18px;">Analysis</strong>
                    </div>
                    <p style="margin-left: 34px; color: var(--text-primary);">${text}</p>
                </div>
            `;
        }
        // Check for Explanation section
        else if (line.includes('**Explanation:**') || line.startsWith('Explanation:')) {
            const text = line.replace(/\*\*Explanation:\*\*/g, '').replace(/Explanation:/g, '').trim();
            html += `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 24px;">💡</span>
                        <strong style="color: var(--accent-color); font-size: 18px;">Explanation</strong>
                    </div>
                    <p style="margin-left: 34px; color: var(--text-primary);">${text}</p>
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

            const scoreMatch = text.match(/(\d+)/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            const percentage = Math.min(score, 100);
            
            let scoreColor = '#ff6b6b';
            if (score >= 70) scoreColor = '#51cf66';
            else if (score >= 40) scoreColor = '#ffd43b';
            
            html += `
                <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <span style="font-size: 24px;">📊</span>
                        <strong style="color: var(--accent-color); font-size: 18px;">Credibility Score</strong>
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
        // Regular text without special markers
        else if (!line.includes('**') && line.length > 0) {
            html += `<p style="margin-bottom: 12px; color: var(--text-primary);">${line}</p>`;
        }
        // Text with bold markers
        else {
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--accent-color);">$1</strong>');
            html += `<p style="margin-bottom: 12px; color: var(--text-primary);">${formatted}</p>`;
        }
    });
    
    return html || content.replace(/\n/g, '<br>');
}