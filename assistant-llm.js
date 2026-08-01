// assistant-llm.js — provider adapter for the Home & Me Assistant.
// One chat() interface, three backends:
//   claude — window.claude.complete, built into this preview, no key needed (default)
//   openai — direct browser call with YOUR API key from localStorage. Dev/testing only:
//            a key in the browser is visible to anyone who opens devtools. Same rule as
//            the data.gov.sg key — production keys live server-side.
//   proxy  — POST to your own server (default /api/chat) which holds the OpenAI key.
//            This is the production pattern; it fails gracefully in this preview.

const LS = { provider: 'hnm-llm-provider', key: 'hnm-openai-key', model: 'hnm-openai-model', proxy: 'hnm-proxy-url' };

export function getConfig() {
  return {
    provider: localStorage.getItem(LS.provider) || 'claude',
    key: localStorage.getItem(LS.key) || '',
    model: localStorage.getItem(LS.model) || 'gpt-4o-mini',
    proxyUrl: localStorage.getItem(LS.proxy) || '/api/chat'
  };
}
export function saveConfig(c) {
  localStorage.setItem(LS.provider, c.provider);
  localStorage.setItem(LS.key, c.key || '');
  localStorage.setItem(LS.model, c.model || 'gpt-4o-mini');
  localStorage.setItem(LS.proxy, c.proxyUrl || '/api/chat');
}

// Downscale + re-encode an uploaded plan so the request stays under budget (~200K base64 chars).
export async function fileToPlanImage(file) {
  const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  let px = 1000, q = 0.72, out = '';
  for (let tries = 0; tries < 5; tries++) {
    const s = Math.min(1, px / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL('image/jpeg', q);
    if (out.length < 200000) break;
    px *= 0.8; q = Math.max(0.5, q - 0.08);
  }
  return { media: 'image/jpeg', data: out.split(',')[1] };
}

const trim = (history) => {
  const h = history.slice(-14);
  const lastUserIdx = h.map((m) => m.role).lastIndexOf('user');
  return { h, lastUserIdx };
};

export async function chatLLM({ system, history, cfg }) {
  const c = cfg || getConfig();
  if (c.provider === 'openai') return openaiChat(system, history, c);
  if (c.provider === 'proxy') return proxyChat(system, history, c);
  return claudeChat(system, history);
}

async function claudeChat(system, history) {
  if (!window.claude || !window.claude.complete) throw new Error('The built-in Claude helper is not available in this view. Open the page inside the preview, or switch provider in Model & keys.');
  const { h, lastUserIdx } = trim(history);
  const messages = h.map((m, i) => {
    if (m.img && i === lastUserIdx) return { role: m.role, content: [
      { type: 'image', source: { type: 'base64', media_type: m.img.media, data: m.img.data } },
      { type: 'text', text: m.text }
    ] };
    return { role: m.role, content: (m.img ? '[customer attached a floor plan earlier] ' : '') + m.text };
  });
  const text = await window.claude.complete({ model: 'claude-sonnet-4-5', max_tokens: 900, system, messages });
  return (text || '').trim();
}

async function openaiChat(system, history, c) {
  if (!c.key) throw new Error('No OpenAI API key set. Open Model & keys and paste your key (kept only in this browser). Note: a ChatGPT Plus subscription is separate from the API — you need a platform.openai.com key with billing.');
  const { h, lastUserIdx } = trim(history);
  const messages = [{ role: 'system', content: system }].concat(h.map((m, i) => {
    if (m.img && i === lastUserIdx) return { role: m.role, content: [
      { type: 'text', text: m.text },
      { type: 'image_url', image_url: { url: 'data:' + m.img.media + ';base64,' + m.img.data } }
    ] };
    return { role: m.role, content: (m.img ? '[customer attached a floor plan earlier] ' : '') + m.text };
  }));
  let r;
  try {
    r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.key },
      body: JSON.stringify({ model: c.model || 'gpt-4o-mini', max_tokens: 900, messages })
    });
  } catch (e) { throw new Error('Could not reach api.openai.com from this browser (network or CORS block). Try again, or use the server proxy in production.'); }
  if (r.status === 401) throw new Error('OpenAI rejected the key (401). Check it at platform.openai.com — note a ChatGPT subscription alone does not include API access.');
  if (r.status === 429) throw new Error('OpenAI rate limit or no credit (429). Check your API billing at platform.openai.com.');
  if (!r.ok) throw new Error('OpenAI error ' + r.status + '. Try again or switch provider in Model & keys.');
  const j = await r.json();
  return ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
}

async function proxyChat(system, history, c) {
  const { h } = trim(history);
  let r;
  try {
    r = await fetch(c.proxyUrl || '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: h.map((m) => ({ role: m.role, text: m.text, img: m.img || null })) })
    });
  } catch (e) { throw new Error('The Home & Me server is not deployed in this preview. Proxy mode is the production setup: your server holds the OpenAI key and forwards chats from ' + (c.proxyUrl || '/api/chat') + '.'); }
  if (!r.ok) throw new Error('Server replied ' + r.status + ' from ' + (c.proxyUrl || '/api/chat') + '.');
  const j = await r.json();
  return (j.text || '').trim();
}
