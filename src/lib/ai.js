const KEYS_STORAGE = "fizzrix.ai.keys";
const PROVIDER_STORAGE = "fizzrix.ai.provider";
const MODELS_STORAGE = "fizzrix.ai.models";
const LEGACY_KEY_STORAGE = "fizzrix.claude.apikey";

export const PROVIDERS = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    keyUrl: "https://console.anthropic.com",
    keyPlaceholder: "sk-ant-...",
    freeNote: null,
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", badge: "Fast" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", badge: "Best" }
    ]
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-...",
    freeNote: null,
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini", badge: "Fast" },
      { id: "gpt-4o", label: "GPT-4o", badge: "Best" }
    ]
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyPlaceholder: "AIza...",
    freeNote: "Free tier available via Google AI Studio",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", badge: "Free" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", badge: "Free" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", badge: "Paid" }
    ]
  },
  groq: {
    id: "groq",
    name: "Groq",
    keyUrl: "https://console.groq.com/keys",
    keyPlaceholder: "gsk_...",
    freeNote: "Completely free — very fast inference",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", badge: "Free" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", badge: "Free · Fastest" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", badge: "Free" }
    ]
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-...",
    freeNote: "Access to many free open-source models",
    models: [
      { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B", badge: "Free" },
      { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B", badge: "Free" },
      { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B", badge: "Free" }
    ]
  }
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

// --- Storage helpers ---

function readKeys() {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    const keys = raw ? JSON.parse(raw) : {};
    // One-time migration from old single-key storage
    if (!keys.anthropic) {
      const legacy = localStorage.getItem(LEGACY_KEY_STORAGE);
      if (legacy) {
        keys.anthropic = legacy;
        localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
      }
    }
    return keys;
  } catch {
    return {};
  }
}

function readModels() {
  try {
    const raw = localStorage.getItem(MODELS_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getApiKey(providerId) {
  return readKeys()[providerId] || "";
}

export function setApiKey(providerId, key) {
  const keys = readKeys();
  if (key && key.trim()) {
    keys[providerId] = key.trim();
  } else {
    delete keys[providerId];
  }
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
}

export function getSelectedProvider() {
  return localStorage.getItem(PROVIDER_STORAGE) || "anthropic";
}

export function setSelectedProvider(providerId) {
  localStorage.setItem(PROVIDER_STORAGE, providerId);
}

export function getSelectedModel(providerId) {
  return readModels()[providerId] || "";
}

export function setSelectedModel(providerId, modelId) {
  const models = readModels();
  models[providerId] = modelId;
  localStorage.setItem(MODELS_STORAGE, JSON.stringify(models));
}

export function getActiveKey() {
  return getApiKey(getSelectedProvider());
}

function resolveModel(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) return "";
  const stored = getSelectedModel(providerId);
  return (stored && provider.models.find(m => m.id === stored)) ? stored : provider.models[0].id;
}

// --- Provider API calls ---

async function callAnthropic(apiKey, model, messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json"
    },
    body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages })
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
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "system", content: systemPrompt }, ...messages]
    })
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
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// --- Unified entry point ---

export async function callAI(messages, systemPrompt) {
  const providerId = getSelectedProvider();
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error("Unknown AI provider selected.");

  const apiKey = getApiKey(providerId);
  if (!apiKey) throw new Error(`No API key set for ${provider.name}. Add it in Settings.`);

  const model = resolveModel(providerId);

  switch (providerId) {
    case "anthropic":
      return callAnthropic(apiKey, model, messages, systemPrompt);
    case "openai":
      return callOpenAICompat(apiKey, model, messages, systemPrompt, "https://api.openai.com/v1");
    case "groq":
      return callOpenAICompat(apiKey, model, messages, systemPrompt, "https://api.groq.com/openai/v1");
    case "openrouter":
      return callOpenAICompat(apiKey, model, messages, systemPrompt, "https://openrouter.ai/api/v1", {
        "HTTP-Referer": window.location.origin,
        "X-Title": "Fizzrix's Massive Modulatorium"
      });
    case "gemini":
      return callGemini(apiKey, model, messages, systemPrompt);
    default:
      throw new Error("Unsupported provider.");
  }
}
