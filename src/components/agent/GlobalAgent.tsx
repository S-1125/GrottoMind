import { useEffect, useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAgent } from './AgentContext'
import './GlobalAgent.css'

/* ============================================================
   GlobalAgent: 悬浮全局的"问窟者"智能体
   接入 FastAPI + Gemini SSE 流式对话
   使用 localStorage 持久化对话历史
============================================================ */

interface SourceRef {
  index: number
  title: string
  snippet: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  sources?: SourceRef[]
}

const STORAGE_KEY = 'grottomind_chat_history'
const API_BASE = import.meta.env.VITE_AGENT_API || ''

/** 从 localStorage 还原历史 */
function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* 忽略解析失败 */ }
  return [
    { role: 'assistant', content: '你好，我是问窟者。你正在游览栖霞山数字档案馆。有什么我可以帮你的吗？', timestamp: Date.now() }
  ]
}

/** 持久化到 localStorage */
function saveHistory(messages: ChatMessage[]) {
  try {
    // 只保留最近 100 条，避免爆 localStorage
    const trimmed = messages.slice(-100)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch { /* 存储满时静默失败 */ }
}

/** 解析 [COLOR_CARD ...] 标签，拆分为文本段和色卡对象 */
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
  const { currentChapter, navigateToChapter, isChatOpen, setChatOpen, orbVisible, setPendingLiteratureNav } = useAgent()
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory)
  const [isStreaming, setIsStreaming] = useState(false)
  const historyEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 消息变化时持久化 + 自动滚到底部
  useEffect(() => {
    saveHistory(messages)
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 聊天框打开时聚焦输入框
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isChatOpen])

  // 阻止面板上的滚轮事件穿透到下层页面（Lenis / 原生滚动）
  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !isChatOpen) return

    const handleWheel = (e: WheelEvent) => {
      const scrollable = panel.querySelector('.ga-chat-history') as HTMLElement | null
      if (!scrollable) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollable
      const atTop = scrollTop <= 0 && e.deltaY < 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0

      // 到达边界时阻止默认行为，防止穿透到外层
      if (atTop || atBottom) {
        e.preventDefault()
      }
      e.stopPropagation()
    }

    panel.addEventListener('wheel', handleWheel, { passive: false })
    return () => panel.removeEventListener('wheel', handleWheel)
  }, [isChatOpen])

  // 根据章节获取上下文
  const getContextHint = useCallback(() => {
    switch (currentChapter) {
      case 'intro': return '当前位置：栖霞山远景'
      case 'ch1': return '当前位置：第一章 · 塔与窟'
      case 'ch2': return '当前位置：第二章 · 数字焕颜'
      case 'ch3': return '当前位置：第三章 · 问窟文献库'
      default: return ''
    }
  }, [currentChapter])

  /** 发送消息并接收 SSE 流式回复 */
  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsStreaming(true)

    // 占位的 AI 消息（后续流式填充）
    const aiMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
    setMessages(prev => [...prev, aiMsg])

    try {
      const response = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          // Gemini 支持超长上下文，提升记忆轮次到 100 条（50轮对话）
          history: messages.slice(-100).map(m => ({ role: m.role, content: m.content })),
          chapterContext: getContextHint()
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
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: accumulated
                    }
                    return updated
                  })
                }
                // 接收 RAG 引用源数据
                if (data.sources) {
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      sources: data.sources
                    }
                    return updated
                  })
                }
                if (data.error) {
                  accumulated += `\n⚠️ 错误: ${data.error}`
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: accumulated
                    }
                    return updated
                  })
                }
              } catch { /* 忽略 JSON 解析错误 */ }
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
  }, [inputText, isStreaming, messages, getContextHint])


  if (!orbVisible) return null

  /** 渲染 AI 消息内容（Markdown + 色卡组件） */
  const renderAssistantContent = (content: string, sources?: SourceRef[]) => {
    const segments = parseColorCards(content)
    return (
      <>
        {segments.map((seg, si) => {
          if (seg.type === 'color') {
            return (
              <div key={si} className="ga-color-card">
                <div className="ga-color-swatch" style={{ backgroundColor: seg.hex }} />
                <div className="ga-color-info">
                  <div className="ga-color-header">
                    <span className="ga-color-name">{seg.name}</span>
                    <span className="ga-color-hex">{seg.hex}</span>
                  </div>
                  <div className="ga-color-meta">
                    <span className="ga-color-period">{seg.period}</span>
                    {seg.material && <span className="ga-color-material">{seg.material}</span>}
                  </div>
                </div>
              </div>
            )
          }
          return (
            <ReactMarkdown key={si} components={{
              a: ({ href, children }) => {
                // 解码 href，兼容 URL 编码的中文
                const decodedHref = href ? decodeURIComponent(href) : ''
                
                // 拦截文献引用链接：格式为 [1](#来源:文献标题)
                if (decodedHref.includes('来源:') || decodedHref.includes('来源：')) {
                  // 提取文献标题
                  const sourceTitle = decodedHref
                    .replace(/^#/, '')
                    .replace(/^来源[:：]\s*/, '')
                  
                  // 从引用编号中提取数字，查找对应的 RAG snippet
                  const citationNum = parseInt(String(children), 10)
                  const matchedSource = sources?.find(s => s.index === citationNum)
                  
                  return (
                    <span
                      className="ga-citation"
                      data-tooltip={sourceTitle}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // 设置待跳转信息（包含 snippet 用于段落定位）
                        setPendingLiteratureNav({
                          title: sourceTitle,
                          snippet: matchedSource?.snippet
                        })
                        navigateToChapter('ch3')
                        setChatOpen(false)
                      }}
                    >
                      {children}
                    </span>
                  )
                }
                // 其他 # 链接也阻止默认跳转
                if (href && href.startsWith('#')) {
                  return <span className="ga-citation-plain">{children}</span>
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                )
              }
            }}>
              {seg.value}
            </ReactMarkdown>
          )
        })}
      </>
    )
  }

  return (
    <div className={`global-agent ${isChatOpen ? 'is-open' : ''}`}>
      {/* 聊天面板 */}
      {isChatOpen && (
        <div className="ga-chat-panel" ref={panelRef}>
          {/* 顶部栏 */}
          <div className="ga-chat-header">
            <div className="ga-chat-title">
              <div className="ga-chat-brand">
                <div className="ga-brand-icon">
                  <img src="/assets/wenku-logo-final.png" alt="GrottoMind" />
                </div>
                <div>
                  <h3>GrottoMind</h3>
                  <span className="ga-chat-status">
                    <span className="ga-status-dot" />
                    {isStreaming ? '思考中…' : '在线'}
                  </span>
                </div>
              </div>
            </div>
            <div className="ga-chat-header-actions">
              <button
                className="ga-header-btn"
                onClick={() => {
                  setMessages([{ role: 'assistant', content: '对话已清空。有什么我可以帮你的吗？', timestamp: Date.now() }])
                }}
                title="清空对话"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
              </button>
              <button className="ga-header-btn" onClick={() => setChatOpen(false)} title="关闭">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* 章节位置条 */}
          <div className="ga-chat-context-bar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
            </svg>
            {getContextHint()}
          </div>

          {/* 消息列表 */}
          <div className="ga-chat-history">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ga-msg ga-msg--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ga-msg-avatar">
                    <img src="/assets/wenku-logo-final.png" alt="AI" />
                  </div>
                )}
                <div className="ga-msg-bubble">
                  {msg.role === 'assistant'
                    ? renderAssistantContent(msg.content || (isStreaming && idx === messages.length - 1 ? '…' : ''), msg.sources)
                    : (msg.content || '')}
                  {isStreaming && idx === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="ga-typing-cursor" />
                  )}
                </div>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>

          {/* 输入区 */}
          <div className="ga-chat-input-area">
            <div className="ga-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                placeholder={isStreaming ? '正在回复中…' : '向问窟者提问…'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                disabled={isStreaming}
              />
              <button
                className="ga-btn-send"
                onClick={handleSend}
                disabled={isStreaming || !inputText.trim()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
