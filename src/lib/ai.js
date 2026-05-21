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

// --- Unified entry point ---

export async function callAI(messages, systemPrompt) {
  const providerId = getSelectedProvider();
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error("Unknown AI provider selected.");

  const apiKey = getApiKey(providerId);
  if (!apiKey) throw new Error(`No API key set for ${provider.name}. Add it in Settings.`);

  const model = resolveModel(providerId);

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: providerId, apiKey, model, messages, systemPrompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}
