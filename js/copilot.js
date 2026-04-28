/* ============================================
   FINVERSE - AI Copilot
   ============================================ */

let copilotHistory = [];

function initCopilot() {
    addCopilotMessage('assistant', 'Hello! I\'m your FinSight AI Copilot. I can help you understand your spending patterns, credit health, forecasts, and flag any unusual activity. What would you like to know about your finances?');
}

function addCopilotMessage(role, content) {
    copilotHistory.push({ role, content });
    renderCopilotMessages();
}

function formatMarkdown(text) {
    if (!text) return "";
    let html = text;
    // Replace **text** with <b>text</b>
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Replace bullet points '* ' with '<br>• '
    html = html.replace(/(?:^|\n)\*\s+(.*)/g, '<br>• $1');
    // Replace normal newlines with <br>
    html = html.replace(/\n/g, '<br>');
    // Remove leading <br>s if they got double-added
    html = html.replace(/^(<br>)+/, '');
    return html;
}

function renderCopilotMessages() {
    const container = document.getElementById('copilotMessages');
    if (!container) return;

    // Get real user initials
    let userInitials = 'AK';
    const userStr = sessionStorage.getItem('finverse_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) {
            userInitials = user.name
                .split(' ')
                .map(w => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
    }

    container.innerHTML = copilotHistory.map(m => `
    <div class="chat-message ${m.role}">
      <div class="chat-avatar ${m.role === 'assistant' ? 'ai' : 'human'}">
        ${m.role === 'assistant' ? 'AI' : userInitials}
      </div>
      <div class="chat-bubble">${m.role === 'assistant' ? formatMarkdown(m.content) : m.content}</div>
    </div>
  `).join('');
    container.scrollTop = container.scrollHeight;
}

function sendCopilotMessage() {
    const input = document.getElementById('copilotInput');
    const message = input.value.trim();
    if (!message) return;
    addCopilotMessage('user', message);
    input.value = '';
    document.getElementById('copilotSuggestions').style.display = 'none';
    const container = document.getElementById('copilotMessages');
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
    <div class="chat-avatar ai">AI</div>
    <div class="chat-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
  `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
    
    // Call Real AI API immediately
    fetchAIData(message);
}

async function fetchAIData(query) {
    const userStr = sessionStorage.getItem('finverse_user');
    if (!userStr) {
        addCopilotMessage('assistant', 'Please sign in to use the AI Copilot.');
        return;
    }
    
    const user = JSON.parse(userStr);
    const userId = user.id;

    // Optional: add text to indicator
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.querySelector('.chat-bubble').innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div> <span style="font-size: 0.85rem; opacity: 0.7; margin-left: 8px;">Generating response...</span>';
    }

    try {
        const response = await fetch(`${API_BASE}/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, query: query })
        });

        const data = await response.json();

        if (data.success) {
            addCopilotMessage('assistant', data.response);
        } else {
            addCopilotMessage('assistant', `Error: ${data.message || 'Something went wrong.'}`);
        }
    } catch (error) {
        console.error('AI Chat Error:', error);
        addCopilotMessage('assistant', 'I\'m having trouble connecting to my brain right now. Please check your internet connection and Gemini API key.');
    }
}

function sendSuggestion(text) {
    document.getElementById('copilotInput').value = text;
    sendCopilotMessage();
}

function handleCopilotKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCopilotMessage();
    }
}

// Removed hardcoded response logic in favor of Real RAG API
