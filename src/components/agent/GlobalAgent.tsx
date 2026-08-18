import { useEffect, useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAgent } from './AgentContext'
import './GlobalAgent.css'

/* ============================================================
   GlobalAgent: 悬浮全局的"问窟者"智能体 (2.0 重构版)
   接入 FastAPI + DeepSeek-V4-Flash / R1 流式推理与学术引用
   支持思考链 (Thinking) 折叠、色卡解析与双向学术文献联动
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
const API_BASE = import.meta.env.VITE_AGENT_API || ''

/** 从 localStorage 还原历史 */
function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* 忽略解析错误 */ }
  return [
    {
      role: 'assistant',
      content: '你好，我是“问窟者”。你正在游览南京栖霞山石窟造像数字复彩档案馆。有什么石窟历史、造像艺术或矿物色彩的问题我可以为你解答吗？',
      timestamp: Date.now()
    }
  ]
}

/** 持久化到 localStorage */
function saveHistory(messages: ChatMessage[]) {
  try {
    const trimmed = messages.slice(-80)
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

  // 阻止面板上的滚轮事件穿透
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
      case 'intro': return '当前位置：序章 · 摄山怀古'
      case 'ch1': return '当前位置：第一章 · 塔与窟 (3D舍利塔)'
      case 'ch2': return '当前位置：第二章 · 数字焕颜 (风化与复彩)'
      case 'ch3': return '当前位置：第三章 · 问窟共创与文献馆'
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

    // 占位的 AI 消息
    const aiMsg: ChatMessage = { role: 'assistant', content: '', thinking: '', timestamp: Date.now() }
    setMessages(prev => [...prev, aiMsg])

    try {
      const response = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-40).map(m => ({ role: m.role, content: m.content })),
          chapterContext: getContextHint()
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let accumulatedThinking = ''
      let sseBuffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          sseBuffer += decoder.decode(value, { stream: true })
          const lines = sseBuffer.split('\n')
          sseBuffer = lines.pop() || ''

          let currentEvent = 'message'
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim()
              continue
            }
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                // 处理思考链事件
                if (currentEvent === 'thinking' && data.delta) {
                  accumulatedThinking += data.delta
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      thinking: accumulatedThinking
                    }
                    return updated
                  })
                }
                
                // 处理常规正文片段
                if (data.text) {
                  accumulatedContent += data.text
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: accumulatedContent
                    }
                    return updated
                  })
                }

                // 处理学术文献引用
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

                // 处理错误
                if (data.error) {
                  accumulatedContent += `\n〔系统提示〕${data.error}`
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: accumulatedContent
                    }
                    return updated
                  })
                }
              } catch { /* 忽略格式错误 */ }
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: '抱歉，智能导览服务暂时无法响应，请稍候再试。'
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [inputText, isStreaming, messages, getContextHint])

  if (!orbVisible) return null

  /** 渲染 AI 消息内容（思考过程 + Markdown + 色卡组件） */
  const renderAssistantContent = (content: string, thinking?: string, sources?: SourceRef[]) => {
    const segments = parseColorCards(content)
    return (
      <>
        {/* 思考链展示折叠框 (DeepSeek-R1 / Thinking) */}
        {thinking && (
          <details className="ga-thinking-box" open={false}>
            <summary className="ga-thinking-summary">
              <span className="ga-thinking-icon">✧</span>
              <span>推演脉络 (Thinking)</span>
            </summary>
            <div className="ga-thinking-content">
              {thinking}
            </div>
          </details>
        )}

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
            <ReactMarkdown
              key={si}
              components={{
                a: ({ href, children }) => {
                  const decodedHref = href ? decodeURIComponent(href) : ''
                  if (decodedHref.includes('来源:') || decodedHref.includes('来源：')) {
                    const sourceTitle = decodedHref
                      .replace(/^#/, '')
                      .replace(/^来源[:：]\s*/, '')
                    
                    const citationNum = parseInt(String(children), 10)
                    const matchedSource = sources?.find(s => s.index === citationNum)
                    
                    return (
                      <span
                        className="ga-citation"
                        data-tooltip={sourceTitle}
                        role="button"
                        tabIndex={0}
                        aria-label={`查看文献引用: ${sourceTitle}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setPendingLiteratureNav({
                            title: sourceTitle,
                            snippet: matchedSource?.snippet,
                            startLine: matchedSource?.start_line
                          })
                          navigateToChapter('ch3')
                          setChatOpen(false)
                        }}
                      >
                        {children}
                      </span>
                    )
                  }
                  if (href && href.startsWith('#')) {
                    return <span className="ga-citation-plain">{children}</span>
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                  )
                }
              }}
            >
              {seg.value}
            </ReactMarkdown>
          )
        })}
      </>
    )
  }

  return (
    <div className={`global-agent ${isChatOpen ? 'is-open' : ''}`} role="region" aria-label="问窟智能导览助手">
      {/* 聊天面板 */}
      {isChatOpen && (
        <div className="ga-chat-panel" ref={panelRef}>
          {/* 顶部栏 */}
          <div className="ga-chat-header">
            <div className="ga-chat-title">
              <div className="ga-chat-brand">
                <div className="ga-brand-icon">
                  <img src="/assets/wenku-logo-final.png" alt="问窟 GrottoMind Logo" />
                </div>
                <div>
                  <h3 className="ga-brand-heading">问窟者 · AI 导览</h3>
                  <span className="ga-chat-status">
                    <span className="ga-status-dot" />
                    {isStreaming ? '推演中…' : '在线'}
                  </span>
                </div>
              </div>
            </div>
            <div className="ga-chat-header-actions">
              <button
                className="ga-header-btn"
                aria-label="新建对话"
                onClick={() => {
                  setMessages([{
                    role: 'assistant',
                    content: '你好，我是“问窟者”。有什么石窟历史、造像艺术或矿物色彩的问题我可以为你解答吗？',
                    timestamp: Date.now()
                  }])
                }}
                title="新建对话"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
              <button className="ga-header-btn" aria-label="关闭问答面板" onClick={() => setChatOpen(false)} title="关闭">
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
                    <img src="/assets/wenku-logo-final.png" alt="问窟智能体头像" />
                  </div>
                )}
                <div className="ga-msg-bubble">
                  {msg.role === 'assistant'
                    ? renderAssistantContent(
                        msg.content || (isStreaming && idx === messages.length - 1 ? '…' : ''),
                        msg.thinking,
                        msg.sources
                      )
                    : (msg.content || '')}
                  {isStreaming && idx === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="ga-typing-cursor" />
                  )}
                </div>
              </div>
            ))}
            <div className="ga-chat-spacer" style={{ height: '140px', flexShrink: 0 }} />
            <div ref={historyEndRef} />
          </div>

          {/* 输入区 */}
          <div className="ga-chat-input-area">
            <div className="ga-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                aria-label="输入您的问题向问窟者提问"
                placeholder={isStreaming ? '问窟者正在推演回答中…' : '向问窟者提问（如：舍利塔飞天有何特点？）'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                disabled={isStreaming}
              />
              <button
                className="ga-btn-send"
                aria-label="发送问题"
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
