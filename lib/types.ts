export interface AnalysisResult {
  tendencia: 'Alta' | 'Baixa' | 'Lateral'
  suporte: string
  resistencia: string
  padrao: string
  entrada: string
  stop: string
  take_profit: string
  confianca: number
  decisao: 'ENTRAR' | 'ESPERAR' | 'EVITAR'
  explicacao: string
}

export interface HistoryEntry {
  id: number
  result: AnalysisResult
  image: string
  date: string
}

export interface User {
  email: string
  name: string
}

export type AppScreen = 'landing' | 'auth' | 'dashboard'
export type DashTab = 'analyze' | 'history'
export type AuthMode = 'login' | 'register'
