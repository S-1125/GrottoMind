import { useEffect, useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAgent } from './AgentContext'
import './GlobalAgent.css'

/* ============================================================
   GlobalAgent: 问窟者 · 数字博物馆科技舱 (Museum Cyber HUD)
   美学特征: 严谨直角 · 激光金石标尺 · 宋体碑铭 × 赛博考据终端
============================================================ */

interface SourceRef {
  index: number
  title: string
  snippet: string
  start_line?: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
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
    {
      role: 'assistant',
      content: '你好，我是“问窟者”。你正身处南京栖霞山石窟造像数字复彩档案馆。关于石窟造像、南唐风貌、矿物色彩或文献考据，我随时为你推演解答。',
      timestamp: Date.now()
    }
  ]
}

function saveHistory(messages: ChatMessage[]) {
  try {
    const trimmed = messages.slice(-60)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch { /* 忽略 */ }
}

type ContentSegment =
  | { type: 'text'; value: string }
  | { type: 'color'; name: string; hex: string; period: string; material: string }

function parseColorCards(text: string): ContentSegment[] {
  const regex = /\[COLOR_CARD\s+name="([^"]*?)"\s+hex="([^"]*?)"\s+period="([^"]*?)"\s+material="([^"]*?)"\]/g
  const parts: ContentSegment[] = []
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', value: text.slice(lastIdx, match.index) })
    }
    parts.push({ type: 'color', name: match[1], hex: match[2], period: match[3], material: match[4] })
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIdx) })
  }
  return parts.length ? parts : [{ type: 'text', value: text }]
}

export function GlobalAgent() {
  const { currentChapter, isChatOpen, setChatOpen, setPendingLiteratureNav } = useAgent()
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory)
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const historyEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    saveHistory(messages)
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isChatOpen])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !isChatOpen) return

    const handleWheel = (e: WheelEvent) => {
      const scrollable = panel.querySelector('.hud-stream') as HTMLElement | null
      if (!scrollable) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollable
      const atTop = scrollTop <= 0 && e.deltaY < 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0

      if (atTop || atBottom) {
        e.preventDefault()
      }
      e.stopPropagation()
    }

    panel.addEventListener('wheel', handleWheel, { passive: false })
    return () => panel.removeEventListener('wheel', handleWheel)
  }, [isChatOpen])

  const getContextHint = useCallback(() => {
    switch (currentChapter) {
      case 'intro': return 'SEC-00 // 序章·摄山怀古'
      case 'ch1': return 'SEC-01 // 第一章·3D舍利塔'
      case 'ch2': return 'SEC-02 // 第二章·数字复彩'
      case 'ch3': return 'SEC-03 // 第三章·学术馆'
      default: return 'ARCHIVE // 全域探寻'
    }
  }, [currentChapter])

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedHex(hex)
      setTimeout(() => setCopiedHex(null), 1500)
    }).catch(() => {})
  }

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    }).catch(() => {})
  }

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim()
    if (!query || isStreaming) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    const userMsg: ChatMessage = { role: 'user', content: query, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsStreaming(true)

    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: '', thinking: '', timestamp: Date.now() }
    ])

    let accumulatedContent = ''
    let accumulatedThinking = ''

    try {
      const response = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: query,
          history: messages.slice(-30).map(m => ({ role: m.role, content: m.content })),
          chapterContext: getContextHint(),
          useReasoning: true
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('流式数据流不可用')

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = 'message'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim()
            continue
          }

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim()
            if (!dataStr) continue

            try {
              const data = JSON.parse(dataStr)

              if (currentEvent === 'thinking' && data.delta) {
                accumulatedThinking += data.delta
                setMessages(prev => {
                  if (!prev.length) return prev
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    thinking: accumulatedThinking
                  }
                  return updated
                })
              } else if (currentEvent === 'message' || currentEvent === '') {
                if (data.text) {
                  accumulatedContent += data.text
                  setMessages(prev => {
                    if (!prev.length) return prev
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: accumulatedContent
                    }
                    return updated
                  })
                }
              }

              if (data.sources) {
                setMessages(prev => {
                  if (!prev.length) return prev
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    sources: data.sources
                  }
                  return updated
                })
              }

              if (data.error) {
                accumulatedContent += `\n[系统] ${data.error}`
                setMessages(prev => {
                  if (!prev.length) return prev
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accumulatedContent
                  }
                  return updated
                })
              }
            } catch { /* 忽略单行 */ }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setMessages(prev => {
        if (!prev.length) return prev
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: '数字档案馆链路暂时阻断，请稍候重新检索。'
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const renderAssistantContent = (content: string, thinking?: string, sources?: SourceRef[], msgIdx?: number) => {
    const segments = parseColorCards(content)

    return (
      <div className="hud-content-block">
        {/* 思考链：神经考古推演矩阵 */}
        {thinking && thinking.trim() && (
          <details className="hud-think-box">
            <summary className="hud-think-summary">
              <span className="hud-radar-indicator" />
              <span className="hud-think-title">考据推演脉络 // REASONING MATRIX</span>
              <span className="hud-think-chevron">▲</span>
            </summary>
            <div className="hud-think-content">
              {thinking}
            </div>
          </details>
        )}

        {/* 博物馆考据正文与色谱样本 */}
        <div className="hud-prose">
          {segments.map((seg, i) => {
            if (seg.type === 'color') {
              const isCopied = copiedHex === seg.hex
              return (
                <div key={i} className="hud-specimen-card" onClick={() => handleCopyColor(seg.hex)}>
                  <div className="hud-specimen-chip" style={{ backgroundColor: seg.hex }} />
                  <div className="hud-specimen-meta">
                    <div className="hud-specimen-h">
                      <span className="hud-specimen-name">{seg.name}</span>
                      <span className="hud-specimen-code">[{seg.period}]</span>
                    </div>
                    <div className="hud-specimen-sub">
                      <span className="hud-specimen-chem">{seg.material}</span>
                      <span className="hud-specimen-hex">{isCopied ? 'COPIED ✓' : seg.hex}</span>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <ReactMarkdown
                key={i}
                components={{
                  a: ({ href, children }) => {
                    const match = href?.match(/^#来源:(.+)$/)
                    if (match) {
                      const docTitle = decodeURIComponent(match[1])
                      const sourceObj = sources?.find(s => s.title.includes(docTitle) || docTitle.includes(s.title))
                      return (
                        <span
                          className="hud-cite-tag"
                          data-tooltip={sourceObj?.snippet || `查阅考据卷宗: ${docTitle}`}
                          onClick={() => {
                            setPendingLiteratureNav({
                              title: docTitle,
                              snippet: sourceObj?.snippet,
                              startLine: sourceObj?.start_line
                            })
                            setChatOpen(false)
                          }}
                        >
                          [卷宗 // {children}]
                        </span>
                      )
                    }
                    if (href && href.startsWith('#')) {
                      return <span className="hud-cite-plain">[{children}]</span>
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                  }
                }}
              >
                {seg.value}
              </ReactMarkdown>
            )
          })}
        </div>

        {/* 底部极简复制 */}
        {content && !isStreaming && msgIdx !== undefined && (
          <div className="hud-msg-actions">
            <button
              className="hud-action-btn"
              onClick={() => handleCopyMessage(content, msgIdx)}
              title="复制考据结论"
            >
              {copiedIdx === msgIdx ? 'COPIED ✓' : 'COPY ARCHIVE'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`global-agent ${isChatOpen ? 'is-open' : ''}`} role="region" aria-label="问窟智能导览助手">
      {isChatOpen && (
        <div className="museum-hud" ref={panelRef}>
          {/* 四角激光瞄准十字 */}
          <div className="hud-crosshair hud-crosshair--tl">+</div>
          <div className="hud-crosshair hud-crosshair--tr">+</div>
          <div className="hud-crosshair hud-crosshair--bl">+</div>
          <div className="hud-crosshair hud-crosshair--br">+</div>

          {/* 终端头部 */}
          <div className="hud-header">
            <div className="hud-header__main">
              <div className="hud-logo-cube">問</div>
              <div className="hud-header__titles">
                <span className="hud-brand-title">问窟者 · 数字档案馆</span>
                <span className="hud-brand-loc">{getContextHint()}</span>
              </div>
            </div>
            <div className="hud-header__btns">
              <button
                className="hud-ctrl-btn"
                aria-label="清空新建"
                title="重新初始化终端"
                onClick={() => {
                  abortControllerRef.current?.abort()
                  setIsStreaming(false)
                  setMessages([{
                    role: 'assistant',
                    content: '你好，我是“问窟者”。你正身处南京栖霞山石窟造像数字复彩档案馆。关于石窟造像、南唐风貌、矿物色彩或文献考据，我随时为你推演解答。',
                    timestamp: Date.now()
                  }])
                }}
              >
                CLR
              </button>
              <button
                className="hud-ctrl-btn hud-ctrl-btn--close"
                aria-label="收起"
                title="收起终端"
                onClick={() => setChatOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 考据流主体 */}
          <div className="hud-stream">
            {messages.map((msg, idx) => (
              <div key={idx} className={`hud-record hud-record--${msg.role}`}>
                <div className="hud-record__badge">
                  <span className="hud-record__tag">{msg.role === 'assistant' ? 'GROTTO_AI' : 'VISITOR'}</span>
                  <span className="hud-record__time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="hud-record__payload">
                  {msg.role === 'assistant'
                    ? renderAssistantContent(
                        msg.content || (isStreaming && idx === messages.length - 1 ? '…' : ''),
                        msg.thinking,
                        msg.sources,
                        idx
                      )
                    : msg.content}
                  {isStreaming && idx === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="hud-laser-cursor" />
                  )}
                </div>
              </div>
            ))}
            <div className="hud-stream-spacer" />
            <div ref={historyEndRef} />
          </div>

          {/* 终端底部输入台 */}
          <div className="hud-console">
            <div className="hud-input-frame">
              <span className="hud-input-prompt">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                aria-label="输入考据指令"
                placeholder={isStreaming ? 'NEURAL ENGINE REASONING...' : '输入考据问题 (ENTER 发送)...'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSendMessage()}
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button
                  className="hud-send-btn hud-send-btn--stop"
                  onClick={() => {
                    abortControllerRef.current?.abort()
                    setIsStreaming(false)
                  }}
                  title="中断推演"
                >
                  HALT
                </button>
              ) : (
                <button
                  className={`hud-send-btn ${inputText.trim() ? 'is-active' : ''}`}
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  title="发送指令"
                >
                  EXEC
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
