import { createContext, useContext, useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'

type ChapterType = 'intro' | 'ch1' | 'ch2' | 'ch3'

interface PendingLiteratureNav {
  title: string
  snippet?: string  // RAG 原始片段文本
  startLine?: number // 原文绝对行号，用于行级精确直达
}

interface AgentContextType {
  currentChapter: ChapterType
  setCurrentChapter: (chapter: ChapterType) => void
  isChatOpen: boolean
  setChatOpen: (isOpen: boolean) => void
  orbVisible: boolean
  setOrbVisible: (visible: boolean) => void
  registerNavigator: (fn: (chapter: ChapterType) => void) => void
  navigateToChapter: (chapter: ChapterType) => void
  /** 待跳转的文献信息（null 表示无待处理跳转） */
  pendingLiteratureNav: PendingLiteratureNav | null
  setPendingLiteratureNav: (nav: PendingLiteratureNav | null) => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [currentChapter, setCurrentChapter] = useState<ChapterType>('intro')
  const [isChatOpen, setChatOpen] = useState(false)
  const [orbVisible, setOrbVisible] = useState(true)
  const [pendingLiteratureNav, setPendingLiteratureNav] = useState<PendingLiteratureNav | null>(null)
  const navigatorRef = useRef<((chapter: ChapterType) => void) | null>(null)

  const registerNavigator = useCallback((fn: (chapter: ChapterType) => void) => {
    navigatorRef.current = fn
  }, [])

  const navigateToChapter = useCallback((chapter: ChapterType) => {
    if (navigatorRef.current) {
      navigatorRef.current(chapter)
    }
  }, [])

  return (
    <AgentContext.Provider value={{
      currentChapter, setCurrentChapter,
      isChatOpen, setChatOpen,
      orbVisible, setOrbVisible,
      registerNavigator, navigateToChapter,
      pendingLiteratureNav, setPendingLiteratureNav
    }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const context = useContext(AgentContext)
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider')
  }
  return context
}
