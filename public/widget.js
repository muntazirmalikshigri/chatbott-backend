(function () {
  'use strict';

  // ─── Config from script tag ───────────────────────────────────────
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var config = {
    agentId:     currentScript.getAttribute('data-agent-id') || '',
    color:       currentScript.getAttribute('data-color') || '#f59e0b',
    company:     currentScript.getAttribute('data-company') || 'Assistant',
    logo:        currentScript.getAttribute('data-logo') || '',
    position:    currentScript.getAttribute('data-position') || 'bottom-right',
    placeholder: currentScript.getAttribute('data-placeholder') || 'Type a message...',
    title:       currentScript.getAttribute('data-title') || 'Chat with us',
    subtitle:    currentScript.getAttribute('data-subtitle') || 'We usually reply instantly',
    apiBase:     currentScript.getAttribute('data-api-base') || 'http://localhost:5000/v1',
  };

  if (!config.agentId) {
    console.warn('[NeuralDesk Widget] data-agent-id is required');
    return;
  }

  // ─── State ───────────────────────────────────────────────────────
  var isOpen = false;
  var isLoading = false;
  var sessionId = null;
  var messages = [];

  // Generate session id
  sessionId = 'wgt-' + Math.random().toString(36).slice(2) + Date.now();

  // ─── Styles ──────────────────────────────────────────────────────
  var css = `
    #nd-widget-btn {
      position: fixed;
      z-index: 999999;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: BRAND_COLOR;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #nd-widget-btn:hover { transform: scale(1.07); box-shadow: 0 6px 32px rgba(0,0,0,0.22); }
    #nd-widget-btn svg { width: 26px; height: 26px; fill: #fff; transition: opacity 0.2s; }

    #nd-widget-window {
      position: fixed;
      z-index: 999998;
      width: 360px;
      height: 520px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 48px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: opacity 0.25s, transform 0.25s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #nd-widget-window.nd-hidden { opacity: 0; transform: translateY(16px) scale(0.97); pointer-events: none; }

    #nd-header {
      background: BRAND_COLOR;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    #nd-header-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 15px; color: #fff;
      overflow: hidden; flex-shrink: 0;
    }
    #nd-header-avatar img { width: 100%; height: 100%; object-fit: cover; }
    #nd-header-info { flex: 1; }
    #nd-header-name { font-weight: 700; font-size: 14px; color: #fff; }
    #nd-header-status { font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 2px; display: flex; align-items: center; gap: 5px; }
    #nd-header-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #4ade80; display: inline-block; }
    #nd-close-btn { background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; color: #fff; font-size: 16px; display: flex; align-items: center; justify-content: center; }
    #nd-close-btn:hover { background: rgba(255,255,255,0.25); }

    #nd-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f8f8f8;
    }
    #nd-messages::-webkit-scrollbar { width: 4px; }
    #nd-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }

    .nd-msg { display: flex; flex-direction: column; max-width: 80%; }
    .nd-msg.nd-user { align-self: flex-end; align-items: flex-end; }
    .nd-msg.nd-bot { align-self: flex-start; align-items: flex-start; }

    .nd-bubble {
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 13.5px;
      line-height: 1.55;
      word-break: break-word;
    }
    .nd-user .nd-bubble { background: BRAND_COLOR; color: #fff; border-radius: 18px 18px 4px 18px; }
    .nd-bot .nd-bubble { background: #fff; color: #1a1a1a; border: 1px solid #eee; border-radius: 18px 18px 18px 4px; }

    .nd-typing { display: flex; gap: 4px; align-items: center; padding: 10px 14px; background: #fff; border: 1px solid #eee; border-radius: 18px 18px 18px 4px; width: fit-content; }
    .nd-typing span { width: 7px; height: 7px; border-radius: 50%; background: #bbb; display: inline-block; animation: nd-bounce 1.2s ease-in-out infinite; }
    .nd-typing span:nth-child(2) { animation-delay: 0.15s; }
    .nd-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes nd-bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1);opacity:1} }

    .nd-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #aaa;
      font-size: 13px;
      padding: 2rem;
      gap: 8px;
    }
    .nd-empty-icon { font-size: 2.5rem; }

    #nd-input-area {
      padding: 12px 14px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      background: #fff;
      flex-shrink: 0;
    }
    #nd-input {
      flex: 1;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 9px 14px;
      font-size: 13.5px;
      outline: none;
      resize: none;
      max-height: 80px;
      font-family: inherit;
      color: #1a1a1a;
      background: #fafafa;
      transition: border-color 0.2s;
    }
    #nd-input:focus { border-color: BRAND_COLOR; background: #fff; }
    #nd-send-btn {
      width: 38px; height: 38px; border-radius: 50%;
      background: BRAND_COLOR; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity 0.2s, transform 0.15s;
    }
    #nd-send-btn:hover { transform: scale(1.05); }
    #nd-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #nd-send-btn svg { width: 18px; height: 18px; fill: #fff; }

    #nd-powered {
      text-align: center;
      font-size: 10px;
      color: #ccc;
      padding: 6px;
      background: #fff;
      border-top: 1px solid #f0f0f0;
    }

    @media (max-width: 420px) {
      #nd-widget-window { width: calc(100vw - 20px); height: calc(100vh - 100px); border-radius: 16px; }
    }
  `.replace(/BRAND_COLOR/g, config.color);

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ─── Position helper ─────────────────────────────────────────────
  var isRight = config.position !== 'bottom-left';
  var posBtn = isRight ? 'right: 20px; bottom: 20px;' : 'left: 20px; bottom: 20px;';
  var posWin = isRight ? 'right: 20px; bottom: 90px;' : 'left: 20px; bottom: 90px;';

  // ─── Chat button ─────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'nd-widget-btn';
  btn.setAttribute('style', posBtn);
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>`;
  document.body.appendChild(btn);

  // ─── Chat window ─────────────────────────────────────────────────
  var win = document.createElement('div');
  win.id = 'nd-widget-window';
  win.className = 'nd-hidden';
  win.setAttribute('style', posWin);

  var avatarContent = config.logo
    ? '<img src="' + config.logo + '" alt="logo" />'
    : config.company.charAt(0).toUpperCase();

  win.innerHTML = `
    <div id="nd-header">
      <div id="nd-header-avatar">${avatarContent}</div>
      <div id="nd-header-info">
        <div id="nd-header-name">${config.title}</div>
        <div id="nd-header-status">${config.subtitle}</div>
      </div>
      <button id="nd-close-btn" aria-label="Close chat">✕</button>
    </div>
    <div id="nd-messages">
      <div class="nd-empty">
        <div class="nd-empty-icon">💬</div>
        <div>Ask us anything!</div>
        <div style="font-size:12px;color:#bbb;">We're here to help</div>
      </div>
    </div>
    <div id="nd-input-area">
      <textarea id="nd-input" rows="1" placeholder="${config.placeholder}"></textarea>
      <button id="nd-send-btn" aria-label="Send">
        <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
      </button>
    </div>
    <div id="nd-powered">Powered by AI</div>
  `;
  document.body.appendChild(win);

  // ─── Elements ────────────────────────────────────────────────────
  var messagesEl = win.querySelector('#nd-messages');
  var inputEl = win.querySelector('#nd-input');
  var sendBtn = win.querySelector('#nd-send-btn');
  var closeBtn = win.querySelector('#nd-close-btn');

  // ─── Toggle ──────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.remove('nd-hidden');
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
    setTimeout(function () { inputEl.focus(); }, 300);
  }

  function closeChat() {
    isOpen = false;
    win.classList.add('nd-hidden');
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>`;
  }

  btn.addEventListener('click', function () { isOpen ? closeChat() : openChat(); });
  closeBtn.addEventListener('click', closeChat);

  // ─── Render messages ─────────────────────────────────────────────
  function renderMessages() {
    if (messages.length === 0) {
      messagesEl.innerHTML = `<div class="nd-empty"><div class="nd-empty-icon">💬</div><div>Ask us anything!</div><div style="font-size:12px;color:#bbb;">We're here to help</div></div>`;
      return;
    }

    messagesEl.innerHTML = '';
    messages.forEach(function (msg) {
      var div = document.createElement('div');
      div.className = 'nd-msg ' + (msg.role === 'user' ? 'nd-user' : 'nd-bot');
      var bubble = document.createElement('div');
      bubble.className = 'nd-bubble';
      bubble.textContent = msg.content;
      div.appendChild(bubble);
      messagesEl.appendChild(div);
    });

    if (isLoading) {
      var typing = document.createElement('div');
      typing.className = 'nd-msg nd-bot';
      typing.innerHTML = '<div class="nd-typing"><span></span><span></span><span></span></div>';
      messagesEl.appendChild(typing);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ─── Send message ────────────────────────────────────────────────
  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;

    messages.push({ role: 'user', content: text });
    inputEl.value = '';
    inputEl.style.height = 'auto';
    isLoading = true;
    sendBtn.disabled = true;
    renderMessages();

    try {
      var res = await fetch(config.apiBase + '/chat/' + config.agentId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId }),
      });

      var data = await res.json();
      var reply = data?.data?.response || "Sorry, I couldn't get a response. Please try again.";
      messages.push({ role: 'bot', content: reply });
    } catch (e) {
      messages.push({ role: 'bot', content: 'Something went wrong. Please try again.' });
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      renderMessages();
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

})();