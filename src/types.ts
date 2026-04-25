export type AskRequest = {
  question?: string
  audienceType?: string
  scene?: string
}

export type AskResponse = {
  answer: string
  caveat: string
  suggestedQuestions: string[]
  source: 'fallback' | 'openai'
}

export type RecolorCardRequest = {
  imagery?: string
  emotion?: string
  colorTone?: string
}

export type RecolorCardResponse = {
  title: string
  keywords: string[]
  palette: string[]
  interpretation: string
  source: 'fallback' | 'openai'
}
