const OpenAI = require('openai');
const { ipcRenderer } = require('electron');
const { marked } = require('marked');
const fs = require('fs');

// ── State ──
const messages = [];
let isStreaming = false;
let config = { apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' };
let client;
let sessionsData = { nextId: 1, sessions: [] };
let sessionsPath = '';
let currentSessionId = null;

// ── DOM ──
const textarea    = document.getElementById('ai-prompt');
const sendBtn     = document.getElementById('send-btn');
const messagesEl  = document.getElementById('messages');
const newChatBtn  = document.getElementById('new-chat-btn');
const chatList    = document.getElementById('chat-list');

// ── Config ──
async function loadConfig() {
    const configPath = await ipcRenderer.invoke('get-config-path');
    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        config = { ...config, ...JSON.parse(raw) };
    } catch {
        console.warn('Failed to read config.json');
    }

    client = new OpenAI({
        apiKey:  config.apiKey,
        baseURL: config.baseURL,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
            'HTTP-Referer': 'https://github.com/pixelated11/openchatter',
            'X-Title': 'OpenChatter',
        }
    });
}

// ── Sessions ──
async function loadSessions() {
    sessionsPath = await ipcRenderer.invoke('get-sessions-path');
    try {
        const raw = fs.readFileSync(sessionsPath, 'utf-8');
        sessionsData = JSON.parse(raw);
    } catch {
        console.warn('Failed to read sessions.json');
    }
    renderChatList();
}

function saveSessions() {
    ipcRenderer.invoke('save-sessions', sessionsData);
}

function renderChatList() {
    chatList.innerHTML = '';
    // Show newest first
    const sorted = [...sessionsData.sessions].reverse();
    for (const session of sorted) {
        const item = document.createElement('div');
        item.className = 'chat-item' + (session.id === currentSessionId ? ' active' : '');
        item.dataset.id = session.id;
        item.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H8l-3 2v-2H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/>
            </svg>
            <span>${session.title}</span>
        `;
        item.addEventListener('click', () => loadSession(session.id));
        chatList.appendChild(item);
    }
}

function loadSession(id) {
    const session = sessionsData.sessions.find(s => s.id === id);
    if (!session) return;

    currentSessionId = id;
    messages.length = 0;
    messages.push(...session.messages);

    messagesEl.innerHTML = '';
    for (const msg of session.messages) {
        appendMessage(msg.role, msg.content);
    }

    renderChatList();
}

function createNewSession(firstMessage) {
    const id = sessionsData.nextId++;
    const title = firstMessage.length > 40
        ? firstMessage.slice(0, 40) + '…'
        : firstMessage;

    const session = { id, title, messages: [] };
    sessionsData.sessions.push(session);
    currentSessionId = id;
    saveSessions();
    renderChatList();
    return session;
}

function updateCurrentSession() {
    const session = sessionsData.sessions.find(s => s.id === currentSessionId);
    if (session) {
        session.messages = [...messages];
        saveSessions();
    }
}

// ── New chat button ──
newChatBtn.addEventListener('click', () => {
    currentSessionId = null;
    messages.length = 0;
    messagesEl.innerHTML = '';
    textarea.value = '';
    textarea.style.height = 'auto';
    renderChatList();
});

// ── Auto-resize textarea ──
textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
});

// ── Send on Enter ──
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming) sendMessage();
    }
});

sendBtn.addEventListener('click', () => {
    if (!isStreaming) sendMessage();
});

// ── Append bubble ──
function appendMessage(role, text = '') {
    const el = document.createElement('div');
    if (role === 'user') {
        el.className = 'msg-user';
        el.textContent = text; // plain text for user, no markdown
    } else {
        el.className = 'msg-assistant';
        el.innerHTML = `<div class="label">OpenChatter</div><div class="body"></div>`;
        el.querySelector('.body').innerHTML = marked.parse(text || '');
    }
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
}

// ── Send message ──
async function sendMessage() {
    const content = textarea.value.trim();
    if (!content) return;

    // Create session on first message
    if (currentSessionId === null) {
        createNewSession(content);
    }

    messages.push({ role: 'user', content });
    appendMessage('user', content);

    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;
    isStreaming = true;

    const assistantEl = appendMessage('assistant', '');
    const body = assistantEl.querySelector('.body');

    try {
        const stream = await client.chat.completions.create({
            model: config.model,
            messages,
            stream: true,
        });

        let fullReply = '';
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            fullReply += delta;
            body.innerHTML = marked.parse(fullReply); // parse on every chunk
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        messages.push({ role: 'assistant', content: fullReply });
        updateCurrentSession();

    } catch (err) {
        body.textContent = `Error: ${err.message}`;
    }

    sendBtn.disabled = false;
    isStreaming = false;
    textarea.focus();
}

// ── Init ──
async function init() {
    await loadConfig();
    await loadSessions();
}

init(); // it's hard, innit?