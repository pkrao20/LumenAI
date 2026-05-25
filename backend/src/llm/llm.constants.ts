export const LLM_FACTORY = 'LLM_FACTORY';

export const SUPPORTED_PROVIDERS = ['groq', 'gemini', 'openrouter', 'ollama'] as const;
export type LLMProviderName = (typeof SUPPORTED_PROVIDERS)[number];
