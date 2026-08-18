import { useState, useRef, useCallback, useEffect } from 'react'
import { useAgent } from './agent/AgentContext'
import { LiteratureLibrary } from './LiteratureLibrary'
import { KnowledgeGraphModal } from './KnowledgeGraphModal'
import { parseColorCards, ColorCardGroup } from './ColorCard'
import { soundEngine } from '../utils/soundEngine'
import ReactMarkdown from 'react-markdown'
import './GrottoHub.css'

/* ============================================================
   GrottoHub: 第三章 · 问窟枢纽
   以 AI 球体为视觉核心的全屏交互场景
============================================================ */

interface GrottoHubProps {
  onBack: () => void
}

interface SourceRef {
  index: number
  title: string
  snippet: string
  start_line?: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  sources?: SourceRef[]
}

const STORAGE_KEY = 'grottomind_chat_history_v2'
const API_BASE = import.meta.env.VITE_AGENT_API || 'https://grottomind.onrender.com'

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* 忽略 */ }
  return [
    { role: 'assistant', content: '欢迎来到问窟枢纽。我是问窟者，你有什么想问我的？', timestamp: Date.now() }
  ]
}

function saveHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)))
  } catch { /* 忽略 */ }
}

/** 修复 AI 输出中不规范的角标链接格式，确保 Markdown 能正确解析
 * 
 * 处理的变体：
 * - [1] (#来源:标题)   → 空格
 * - [1]（#来源：标题） → 中文括号
 * - [1](#来源:标题(1)) → 标题内含括号
 * - [1] ( #来源: 标题 ）→ 混合格式
 */
function fixCitations(text: string): string {
  // 一条正则统一匹配所有角标变体：
  // [数字] + 可选空格 + 中/英左括号 + 可选空格 + #来源 + 中/英冒号 + 标题 + 中/英右括号
  // 使用 (?=[^)）]|$) 确保匹配最外层右括号（标题含括号时会回溯到最外层）
  return text.replace(
    /\[(\d+)\]\s*[（(]\s*#来源[：:]\s*(.+?)\s*[)）](?=[^)）]|$)/g,
    (_match, num, title) => {
      // URL 编码标题中的圆括号，防止 Markdown 解析器误判
      const encodedTitle = title.trim().replace(/\(/g, '%28').replace(/\)/g, '%29')
      return `[${num}](#来源:${encodedTitle})`
    }
  )
}

export function GrottoHub({ onBack }: GrottoHubProps) {
  const { setOrbVisible, currentChapter, pendingLiteratureNav, setPendingLiteratureNav } = useAgent()
  const [view, setView] = useState<'hub' | 'literature'>('hub')
  const [autoSelectTitle, setAutoSelectTitle] = useState<string | null>(null)
  const [autoScrollSnippet, setAutoScrollSnippet] = useState<string | null>(null)
  const [autoScrollLine, setAutoScrollLine] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState<{content: string, timestamp: number, question: string}[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const historyEndRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  // 监听从 GlobalAgent 引用跳转过来的信号
  useEffect(() => {
    if (pendingLiteratureNav && currentChapter === 'ch3') {
      setAutoSelectTitle(pendingLiteratureNav.title)
      setAutoScrollSnippet(pendingLiteratureNav.snippet || null)
      setAutoScrollLine(pendingLiteratureNav.startLine || null)
      setView('literature')
      setPendingLiteratureNav(null)
    }
  }, [pendingLiteratureNav, currentChapter, setPendingLiteratureNav])

  // 根据当前是否激活了第三章来隐藏/显示全局悬浮球
  useEffect(() => {
    if (currentChapter === 'ch3') {
      setOrbVisible(false)
    } else {
      setOrbVisible(true)
    }
  }, [currentChapter, setOrbVisible])

  // 核心状态：是否已经开始对话（只要消息超过1条，即进入“沉浸空间”状态）
  const isChatting = messages.length > 1

  // 当前正在展示的字幕（最后一条消息）
  const latestMessage = messages.at(-1)

  useEffect(() => { saveHistory(messages) }, [messages])
  useEffect(() => {
    if (showHistory) historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showHistory])

  // AI 有新内容时，自动滚动主区到底部
  useEffect(() => {
    if (isStreaming && mainRef.current) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsStreaming(true)

    const aiMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
    setMessages(prev => [...prev, aiMsg])

    try {
      const response = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
          chapterContext: '第三章 · 问窟枢纽'
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let sseBuffer = '' // 缓冲不完整的行

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          sseBuffer += decoder.decode(value, { stream: true })
          // 按完整行拆分，保留最后一个不完整的片段
          const lines = sseBuffer.split('\n')
          sseBuffer = lines.pop() || '' // 最后一段可能不完整，留到下次
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.text) {
                  accumulated += data.text
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated }
                    return updated
                  })
                }
                // 接收 RAG 引用源数据（用于段落定位）
                if (data.sources) {
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { ...updated[updated.length - 1], sources: data.sources }
                    return updated
                  })
                }
              } catch { /* 忽略 */ }
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: '抱歉，AI 服务暂时无法连接，请稍后再试。'
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [inputText, isStreaming, messages])

  // 如果是文献库二级页面
  if (view === 'literature') {
    return <LiteratureLibrary onBack={() => { setAutoSelectTitle(null); setAutoScrollSnippet(null); setAutoScrollLine(null); setView('hub') }} autoSelectTitle={autoSelectTitle} autoScrollSnippet={autoScrollSnippet} autoScrollLine={autoScrollLine} />
  }

  return (
    <div className="grotto-hub">
      {/* ——— 顶部导航栏 ——— */}
      <nav className="gh-nav">
        <button className="gh-nav__back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回展览
        </button>

        <div className="gh-nav__center">
          <span className="gh-nav__chapter">第三章 · 问窟枢纽</span>
        </div>

        <div className="gh-nav__right">
          <button className="gh-nav__lit" onClick={() => setShowGraph(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="12" cy="18" r="3" />
              <line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
              <line x1="7.5" y1="8.5" x2="10.5" y2="15.5" />
              <line x1="16.5" y1="8.5" x2="13.5" y2="15.5" />
            </svg>
            知识图谱
          </button>
          <button className="gh-nav__lit" onClick={() => {
            try {
              const raw = localStorage.getItem('grottomind_notes')
              setNotes(raw ? JSON.parse(raw) : [])
            } catch { setNotes([]) }
            setShowNotes(true)
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            笔记
          </button>
          <button className="gh-nav__lit" onClick={() => setView('literature')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            文献库
          </button>
        </div>
      </nav>

      {/* ——— 中央主体区域 ——— */}
      <div ref={mainRef} className={`gh-main ${isChatting ? 'is-chatting' : ''}`}>
        
        {/* 初见标题区（对话开始后淡出） */}
        <div className="gh-hero-section">
          <h1 className="gh-title">
            向<em>问窟者</em>提问<br />
            探索栖霞山的千年密码
          </h1>
          
          <div className="gh-suggestions">
            {[
              '栖霞山千佛岩是什么时候建造的？',
              '舍利塔上的飞天有什么特点？',
              '数字复彩是如何推演颜色的？',
            ].map((q, i) => (
              <button key={i} className="gh-suggestion-chip" onClick={() => {
                setInputText(q)
                setTimeout(() => inputRef.current?.focus(), 50)
              }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* 电影级字幕区（绝对居中，对话开始后成为主角） */}
        <div className="gh-cinematic-area">
          {latestMessage && latestMessage.role !== 'assistant' && (
            <div className="gh-cinematic-user">
              {latestMessage.content}
            </div>
          )}
          {isStreaming && (() => {
            const assistantContent = latestMessage?.role === 'assistant' ? latestMessage.content : ''
            // AI 尚未返回任何文本 — 显示等待动画
            if (!assistantContent) {
              return (
                <div className="gh-thinking">
                  <div className="gh-thinking-dots">
                    <span /><span /><span />
                  </div>
                  <div className="gh-thinking-label">思考中...</div>
                </div>
              )
            }
            const { cleanText } = parseColorCards(assistantContent)
            return (
              <div className="gh-cinematic-ai gh-cinematic-ai--streaming">
                <ReactMarkdown components={{
                  a: ({...props}) => {
                    const decodedHref = props.href ? decodeURIComponent(props.href) : ''
                    if (decodedHref.includes('来源:') || decodedHref.includes('来源：')) {
                      const sourceTitle = decodedHref.replace(/^#/, '').replace(/^来源[:：]\s*/, '')
                      
                      // 提取角标编号匹配 snippet
                      const citationNum = parseInt(String(props.children), 10)
                      const matchedSource = latestMessage?.sources?.find(s => s.index === citationNum)

                      return (
                        <span
                          className="ga-citation"
                          data-tooltip={sourceTitle}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setAutoSelectTitle(sourceTitle)
                            setAutoScrollSnippet(matchedSource?.snippet || null)
                            setAutoScrollLine(matchedSource?.start_line || null)
                            setView('literature')
                          }}
                        >{props.children}</span>
                      )
                    }
                    if (props.href?.startsWith('#')) return <span className="ga-citation-plain">{props.children}</span>
                    return <a {...props} />
                  }
                }}>{fixCitations(cleanText)}</ReactMarkdown>
              </div>
            )
          })()}
          {!isStreaming && latestMessage?.role === 'assistant' && (() => {
            const { cleanText, cards } = parseColorCards(latestMessage.content)
            return (
              <>
                <div className="gh-cinematic-ai">
                  <ReactMarkdown components={{
                    a: ({...props}) => {
                      const decodedHref = props.href ? decodeURIComponent(props.href) : ''
                      if (decodedHref.includes('来源:') || decodedHref.includes('来源：')) {
                        const sourceTitle = decodedHref.replace(/^#/, '').replace(/^来源[:：]\s*/, '')
                        
                        // 提取角标编号匹配 snippet
                        const citationNum = parseInt(String(props.children), 10)
                        const matchedSource = latestMessage?.sources?.find(s => s.index === citationNum)

                        return (
                          <span
                            className="ga-citation"
                            data-tooltip={sourceTitle}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setAutoSelectTitle(sourceTitle)
                              setAutoScrollSnippet(matchedSource?.snippet || null)
                              setAutoScrollLine(matchedSource?.start_line || null)
                              setView('literature')
                            }}
                          >{props.children}</span>
                        )
                      }
                      if (props.href?.startsWith('#')) return <span className="ga-citation-plain">{props.children}</span>
                      return <a {...props} />
                    }
                  }}>{fixCitations(cleanText)}</ReactMarkdown>
                </div>
                <ColorCardGroup cards={cards} />

                {/* 操作按钮栏 */}
                <div className="gh-actions">
                  <button
                    className={`gh-action-btn gh-action-btn--save ${saved ? 'is-active' : ''}`}
                    onClick={() => {
                      if (saved) return
                      soundEngine.playChime(980, 0.35)
                      try {
                        const notes = JSON.parse(localStorage.getItem('grottomind_notes') || '[]')
                        notes.push({
                          content: latestMessage.content,
                          timestamp: Date.now(),
                          question: messages.length >= 2 ? messages[messages.length - 2]?.content : ''
                        })
                        localStorage.setItem('grottomind_notes', JSON.stringify(notes))
                        setSaved(true)
                        setTimeout(() => setSaved(false), 2000)
                      } catch { /* 忽略 */ }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                    </svg>
                    <span>{saved ? '已保存' : '保存到笔记'}</span>
                  </button>

                  <div className="gh-actions__icons">
                    <button
                      className={`gh-action-icon ${copied ? 'is-active' : ''}`}
                      title="复制"
                      onClick={() => {
                        soundEngine.playChime(720, 0.25)
                        const contentToCopy = latestMessage.content
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(contentToCopy)
                            .then(() => {
                              setCopied(true)
                              setTimeout(() => setCopied(false), 2000)
                            })
                            .catch(() => {
                              fallbackCopy(contentToCopy)
                            })
                        } else {
                          fallbackCopy(contentToCopy)
                        }

                        function fallbackCopy(text: string) {
                          try {
                            const textArea = document.createElement('textarea')
                            textArea.value = text
                            textArea.style.position = 'fixed'
                            textArea.style.opacity = '0'
                            document.body.appendChild(textArea)
                            textArea.focus()
                            textArea.select()
                            document.execCommand('copy')
                            document.body.removeChild(textArea)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          } catch { /* 忽略复制异常 */ }
                        }
                      }}
                    >
                      {copied ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      )}
                    </button>
                    <button
                      className={`gh-action-icon ${feedback === 'up' ? 'is-active' : ''}`}
                      title="有用"
                      onClick={() => setFeedback(prev => prev === 'up' ? null : 'up')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={feedback === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 22V11l-5 1v10h5zM14 9V5.5a2.5 2.5 0 0 0-5 0V9h5zM7 11l3-2 4 .5h6a2 2 0 0 1 2 2v1.5l-2 7.5H7"/>
                      </svg>
                    </button>
                    <button
                      className={`gh-action-icon ${feedback === 'down' ? 'is-active' : ''}`}
                      title="没用"
                      onClick={() => setFeedback(prev => prev === 'down' ? null : 'down')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={feedback === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 2v11l5-1V2h-5zM10 15v3.5a2.5 2.5 0 0 0 5 0V15h-5zM17 13l-3 2-4-.5H4a2 2 0 0 1-2-2v-1.5l2-7.5h10"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* ——— 全屏手稿式文献回溯（历史记录） ——— */}
      {showHistory && (
        <div className="gh-manuscript-overlay">
          <div className="gh-manuscript-close" onClick={() => setShowHistory(false)}>
            <span>返回空间</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="gh-manuscript-content">
            <div className="gh-notes-header">
              <h2 className="gh-manuscript-title">发问志</h2>
              {messages.length > 1 && (
                <button className="gh-notes-clear" onClick={() => {
                  const initial = [messages[0]]
                  setMessages(initial)
                  saveHistory(initial)
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
                  </svg>
                  清空记录
                </button>
              )}
            </div>
            <div className="gh-manuscript-list">
              {messages.slice(1).map((msg, idx) => {
                if (msg.role === 'assistant') {
                  const { cleanText, cards } = parseColorCards(msg.content)
                  return (
                    <div key={idx} className="gh-manuscript-block gh-manuscript-block--assistant">
                      <div className="gh-manuscript-role">窟</div>
                      <div className="gh-manuscript-text-wrap">
                        <div className="gh-manuscript-text">
                          <ReactMarkdown components={{
                            a: ({...props}) => {
                              const decodedHref = props.href ? decodeURIComponent(props.href) : ''
                              if (decodedHref.includes('来源:') || decodedHref.includes('来源：')) {
                                const sourceTitle = decodedHref.replace(/^#/, '').replace(/^来源[:：]\s*/, '')
                                
                                // 提取角标编号匹配 snippet
                                const citationNum = parseInt(String(props.children), 10)
                                const matchedSource = msg.sources?.find(s => s.index === citationNum)

                                return (
                                  <span
                                    className="ga-citation"
                                    data-tooltip={sourceTitle}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setShowHistory(false)
                                      setAutoSelectTitle(sourceTitle)
                                      setAutoScrollSnippet(matchedSource?.snippet || null)
                                      setView('literature')
                                    }}
                                  >{props.children}</span>
                                )
                              }
                              if (props.href?.startsWith('#')) return <span className="ga-citation-plain">{props.children}</span>
                              return <a {...props} />
                            }
                          }}>{fixCitations(cleanText)}</ReactMarkdown>
                        </div>
                        {cards.length > 0 && (
                          <div style={{ marginTop: '16px' }}>
                            <ColorCardGroup cards={cards} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={idx} className="gh-manuscript-block gh-manuscript-block--user">
                    <div className="gh-manuscript-role">客</div>
                    <div className="gh-manuscript-text">{msg.content}</div>
                  </div>
                )
              })}
              <div ref={historyEndRef} style={{ height: '80px' }} />
            </div>
          </div>
        </div>
      )}

      {/* ——— 笔记面板 ——— */}
      {showNotes && (
        <div className="gh-manuscript-overlay">
          <div className="gh-manuscript-close" onClick={() => setShowNotes(false)}>
            <span>返回空间</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="gh-manuscript-content">
            <div className="gh-notes-header">
              <h2 className="gh-manuscript-title">我的笔记</h2>
              {notes.length > 0 && (
                <button className="gh-notes-clear" onClick={() => {
                  localStorage.removeItem('grottomind_notes')
                  setNotes([])
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
                  </svg>
                  清空全部
                </button>
              )}
            </div>
            <div className="gh-manuscript-list">
              {notes.length === 0 ? (
                <div className="gh-notes-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                  <p>还没有笔记</p>
                  <p className="gh-notes-empty-hint">在 AI 回复下方点击「保存到笔记」即可收藏</p>
                </div>
              ) : (
                notes.map((note, idx) => (
                  <div key={idx} className="gh-note-card">
                    <div className="gh-note-card__header">
                      <span className="gh-note-card__time">
                        {new Date(note.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        className="gh-note-card__delete"
                        title="删除笔记"
                        onClick={() => {
                          const updated = notes.filter((_, i) => i !== idx)
                          setNotes(updated)
                          localStorage.setItem('grottomind_notes', JSON.stringify(updated))
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    {note.question && (
                      <div className="gh-note-card__question">
                        <span className="gh-note-card__q-label">问</span>
                        {note.question}
                      </div>
                    )}
                    <div className="gh-note-card__answer">
                      <ReactMarkdown components={{
                        a: ({...props}) => {
                          const decodedHref = props.href ? decodeURIComponent(props.href) : ''
                          if (decodedHref.includes('来源:') || decodedHref.includes('来源：')) {
                            const sourceTitle = decodedHref.replace(/^#/, '').replace(/^来源[:：]\s*/, '')
                            return (
                              <span
                                className="ga-citation"
                                data-tooltip={sourceTitle}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setShowNotes(false)
                                  setAutoSelectTitle(sourceTitle)
                                  setAutoScrollSnippet(null)
                                  setView('literature')
                                }}
                              >{props.children}</span>
                            )
                          }
                          if (props.href?.startsWith('#')) return <span className="ga-citation-plain">{props.children}</span>
                          return <a {...props} />
                        }
                      }}>{fixCitations(parseColorCards(note.content).cleanText)}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
              <div style={{ height: '80px' }} />
            </div>
          </div>
        </div>
      )}

      {/* ——— 隐匿式底部交互栏 ——— */}
      <div className="gh-stealth-input-area">
        <div className="gh-stealth-input-wrapper">
          <button
            className="gh-history-toggle"
            onClick={() => setShowHistory(true)}
            title="对话历史"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            className="gh-stealth-input"
            placeholder={isStreaming ? '正在生成...' : '有什么我可以帮你的？'}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
            disabled={isStreaming}
          />
          <button
            className="gh-stealth-send"
            onClick={handleSend}
            disabled={isStreaming || !inputText.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 栖霞山石窟知识图谱交互模态框 */}
      <KnowledgeGraphModal
        isOpen={showGraph}
        onClose={() => setShowGraph(false)}
        onSelectNode={(nodeName) => {
          setInputText(`请从学术考古与数字复彩角度，详细考据“${nodeName}”在栖霞山石窟造像中的历史演变与艺术特征。`)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
      />
    </div>
  )
}
