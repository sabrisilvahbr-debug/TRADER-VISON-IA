import type { MarketData } from './market'

export type Tendencia = 'Alta' | 'Baixa' | 'Lateral'
export type Decisao = 'ENTRAR' | 'ESPERAR' | 'EVITAR'
export type Perfil = 'conservador' | 'moderado' | 'agressivo'

/** Posições verticais aproximadas, de 0 (topo da imagem) a 1 (base). */
export interface NiveisY {
  suporte?: number
  resistencia?: number
  entrada?: number
  stop?: number
  take_profit?: number
}

export interface AnalysisResult {
  tendencia: Tendencia
  suporte: string
  resistencia: string
  padrao: string
  entrada: string
  stop: string
  take_profit: string
  confianca: number
  decisao: Decisao
  explicacao: string
  riscos: string
  ativo: string
  timeframe: string
  niveis_y?: NiveisY
}

export interface Contexto {
  ativo: string
  timeframe: string
  perfil: Perfil
}

export interface HistoryEntry {
  id: number
  date: string
  thumb: string
  contexto: Contexto
  result: AnalysisResult
  mercado?: MarketData
}
