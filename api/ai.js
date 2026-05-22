const ALLOWED_ORIGINS = [
  'https://fmm-brown.vercel.app',
  'http://localhost:5173',
  'https://localhost:5173',
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { provider, apiKey, model, messages, systemPrompt } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }

  try {
    const text = await dispatch(provider, apiKey, model, messages, systemPrompt, req);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function dispatch(provider, apiKey, model, messages, systemPrompt, req) {
  switch (provider) {
    case 'anthropic':
      return callAnthropic(apiKey, model, messages, systemPrompt);
    case 'openai':
      return callOpenAICompat(apiKey, model, messages, systemPrompt, 'https://api.openai.com/v1');
    case 'groq':
      return callOpenAICompat(apiKey, model, messages, systemPrompt, 'https://api.groq.com/openai/v1');
    case 'openrouter':
      return callOpenAICompat(apiKey, model, messages, systemPrompt, 'https://openrouter.ai/api/v1', {
        'HTTP-Referer': req.headers.origin || 'https://fmm-brown.vercel.app',
        'X-Title': "Fizzrix's Massive Modulatorium",
      });
    case 'gemini':
      return callGemini(apiKey, model, messages, systemPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callAnthropic(apiKey, model, messages, systemPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callOpenAICompat(apiKey, model, messages, systemPrompt, baseUrl, extraHeaders = {}) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(apiKey, model, messages, systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
