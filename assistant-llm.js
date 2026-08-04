// The public browser-assistant prototype is retired. This compatibility adapter
// is intentionally same-origin and fail-closed: it cannot accept provider keys,
// persist credentials, or call a third-party model endpoint from the browser.

const PROXY_PATH = '/api/chat';

export function getConfig() {
  return Object.freeze({ provider: 'same-origin', proxyUrl: PROXY_PATH });
}

export function saveConfig() {
  return getConfig();
}

export async function fileToPlanImage() {
  throw new Error('Browser assistant attachments are retired. Use Project Atelier.');
}

export async function chatLLM({ system = '', history = [] } = {}) {
  const messages = history.slice(-14).map((message) => ({
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    text: String(message?.text || ''),
  }));
  let response;
  try {
    response = await fetch(PROXY_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: String(system), messages }),
    });
  } catch {
    throw new Error('The authenticated assistant service is not released.');
  }
  if (!response.ok) throw new Error('The authenticated assistant service is unavailable.');
  const payload = await response.json();
  return String(payload?.text || '').trim();
}
