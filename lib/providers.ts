export type ProviderId = 'gemini' | 'openai' | 'openrouter'

export interface ProviderInfo {
  id: ProviderId
  label: string
  cost: string
  keyUrl: string
  keyHint: string
  keyPattern: RegExp
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    cost: 'Grátis, sem cartão',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'AIza…',
    keyPattern: /^AIza[0-9A-Za-z_-]{30,60}$/,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    cost: 'Modelos grátis, sem cartão',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'sk-or-…',
    keyPattern: /^sk-or-[0-9A-Za-z_-]{20,200}$/,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    cost: 'Pago, precisa de saldo',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-…',
    keyPattern: /^sk-(?!or-)[0-9A-Za-z_-]{20,200}$/,
  },
]

export const DEFAULT_PROVIDER: ProviderId = 'gemini'

export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find(p => p.id === id)
}
