import { useEffect, useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAgent } from './AgentContext'
import './GlobalAgent.css'

/* ============================================================
   GlobalAgent: 悬浮全局的"问窟者"智能体 (3.0 东方金石高定版)
   融合: 栖霞山金石美学 × Apple Intelligence 玻璃拟态 × DeepSeek 思考流
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

/** 从 localStorage 还原历史 */
function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* 忽略解析错误 */ }
  return [
    {
      role: 'assistant',
      content: '你好，我是“问窟者”。你正游览南京栖霞山石窟造像数字复彩档案馆。关于舍利塔造像、南唐矿物色彩或数字复彩考据，我随时为你解答。',
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

// 章节智能推荐提问词
const CHAPTER_SUGGESTIONS: Record<string, string[]> = {
  intro: ['栖霞山千佛岩有何历史？', '为什么称摄山为金陵明珠？', '南朝造像有何艺术风格？'],
  ch1: ['舍利塔浮雕飞天有何特点？', '舍利塔基座八相成道考据？', '舍利塔的建造年代与南唐复修？'],
  ch2: ['南唐壁画主要使用了哪些矿物颜料？', '朱砂与石青在石窟中的风化机理？', '数字复彩推演的科学依据是什么？'],
  ch3: ['如何查阅《韩熙载夜宴图》服饰考据？', '知识图谱中无量寿佛与舍利塔的关联？', '如何参与数字复彩共创？']
}

export function GlobalAgent() {
  const { currentChapter, isChatOpen, setChatOpen, setPendingLiteratureNav } = useAgent()
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory)
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null)
  
  const historyEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 组件卸载时中止未完成的请求
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // 消息变化时持久化 + 自动平滑滚到底部
  useEffect(() => {
    saveHistory(messages)
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // 聊天框打开时聚焦输入框
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [isChatOpen])

  // 阻止面板上的滚轮事件穿透到底层 3D/视频
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

  // 获取当前章节名称提示
  const getContextHint = useCallback(() => {
    switch (currentChapter) {
      case 'intro': return '序章 · 摄山怀古'
      case 'ch1': return '第一章 · 塔与窟 (3D舍利塔)'
      case 'ch2': return '第二章 · 数字焕颜 (风化与复彩)'
      case 'ch3': return '第三章 · 问窟共创与文献馆'
      default: return '千佛石窟 · 全域导览'
    }
  }, [currentChapter])

  // 复制十六进制色值
  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedHex(hex)
      setTimeout(() => setCopiedHex(null), 1800)
    }).catch(() => {})
  }

  // 复制单条 AI 回复文本
  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgIdx(idx)
      setTimeout(() => setCopiedMsgIdx(null), 1800)
    }).catch(() => {})
  }

  // 发送消息核心逻辑
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

    // 创建 Assistant 占位消息
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
          history: messages.slice(-40).map(m => ({ role: m.role, content: m.content })),
          chapterContext: getContextHint(),
          useReasoning: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('流式读取不可用')

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
                accumulatedContent += `\n〔系统提示〕${data.error}`
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
            } catch {
              // 忽略单行解析失败
            }
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
          content: '抱歉，智能导览服务暂时无法响应，请稍候再试。'
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  // 渲染 Assistant 内容（含思维链折叠胶囊、矿物色卡与文献角标）
  const renderAssistantContent = (content: string, thinking?: string, sources?: SourceRef[], msgIdx?: number) => {
    const segments = parseColorCards(content)

    return (
      <div className="ga-assistant-flow">
        {/* 思维链（Thinking Capsule） */}
        {thinking && thinking.trim() && (
          <details className="ga-thinking-capsule">
            <summary className="ga-thinking-trigger">
              <span className="ga-thinking-badge">
                <svg className="ga-sparkle-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                </svg>
                <span>考据推演脉络</span>
                <span className="ga-thinking-tag">Thinking</span>
              </span>
              <span className="ga-thinking-toggle-arrow">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </summary>
            <div className="ga-thinking-panel">
              <div className="ga-thinking-inner-scroll">
                {thinking}
              </div>
            </div>
          </details>
        )}

        {/* 正文与色卡 */}
        <div className="ga-markdown-body">
          {segments.map((seg, i) => {
            if (seg.type === 'color') {
              const isCopied = copiedHex === seg.hex
              return (
                <div key={i} className="ga-color-card-pro" onClick={() => handleCopyColor(seg.hex)}>
                  <div className="ga-color-swatch-glow" style={{ backgroundColor: seg.hex, boxShadow: `0 8px 24px ${seg.hex}44` }} />
                  <div className="ga-color-details">
                    <div className="ga-color-main-row">
                      <span className="ga-color-title">{seg.name}</span>
                      <span className="ga-color-era-chip">{seg.period}</span>
                    </div>
                    <div className="ga-color-sub-row">
                      <span className="ga-color-material-tag">{seg.material}</span>
                      <button className="ga-color-hex-btn" title="点击复制颜色 Hex 代码">
                        {isCopied ? '已复制 ✓' : seg.hex}
                      </button>
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
                          className="ga-citation-pill"
                          data-tooltip={sourceObj?.snippet || `查阅考据文献: ${docTitle}`}
                          onClick={() => {
                            setPendingLiteratureNav({
                              title: docTitle,
                              snippet: sourceObj?.snippet,
                              startLine: sourceObj?.start_line
                            })
                            setChatOpen(false)
                          }}
                        >
                          〔考据〕{children}
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
        </div>

        {/* 底部小工具条（复制回复） */}
        {content && !isStreaming && msgIdx !== undefined && (
          <div className="ga-msg-footer">
            <button
              className="ga-copy-msg-btn"
              onClick={() => handleCopyMessage(content, msgIdx)}
              title="复制完整回答"
            >
              {copiedMsgIdx === msgIdx ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  const currentSuggestions = CHAPTER_SUGGESTIONS[currentChapter] || CHAPTER_SUGGESTIONS.intro

  return (
    <div className={`global-agent ${isChatOpen ? 'is-open' : ''}`} role="region" aria-label="问窟智能导览助手">
      {/* 聊天面板 */}
      {isChatOpen && (
        <div className="ga-chat-panel" ref={panelRef}>
          {/* 顶部金石栏 */}
          <div className="ga-chat-header">
            <div className="ga-chat-brand">
              <div className="ga-brand-icon">
                <img src="/assets/wenku-logo-final.png" alt="问窟 GrottoMind Logo" />
              </div>
              <div className="ga-brand-text">
                <div className="ga-brand-title-wrap">
                  <h3 className="ga-brand-heading">问窟者</h3>
                  <span className="ga-brand-sub">AI 导览智能体</span>
                </div>
                <div className="ga-chat-status">
                  <span className="ga-status-dot" />
                  <span>{isStreaming ? '正在考据推演…' : getContextHint()}</span>
                </div>
              </div>
            </div>
            <div className="ga-chat-header-actions">
              <button
                className="ga-header-btn"
                aria-label="清空新建对话"
                onClick={() => {
                  abortControllerRef.current?.abort()
                  setIsStreaming(false)
                  setMessages([{
                    role: 'assistant',
                    content: '你好，我是“问窟者”。有什么石窟历史、造像艺术或矿物色彩的问题我可以为你解答吗？',
                    timestamp: Date.now()
                  }])
                }}
                title="清空对话"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
              <button className="ga-header-btn ga-close-btn" aria-label="收起面板" onClick={() => setChatOpen(false)} title="收起">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* 消息列表主体（带平滑阻尼与柔和滚动条） */}
          <div className="ga-chat-history">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ga-msg ga-msg--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ga-msg-avatar">
                    <img src="/assets/wenku-logo-final.png" alt="问窟智能体" />
                  </div>
                )}
                <div className="ga-msg-bubble">
                  {msg.role === 'assistant'
                    ? renderAssistantContent(
                        msg.content || (isStreaming && idx === messages.length - 1 ? '…' : ''),
                        msg.thinking,
                        msg.sources,
                        idx
                      )
                    : (msg.content || '')}
                  {isStreaming && idx === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="ga-typing-cursor" />
                  )}
                </div>
              </div>
            ))}

            {/* 智能推荐提问气泡（无流式且消息少于3条时展示） */}
            {!isStreaming && messages.length <= 2 && (
              <div className="ga-suggestions-wrap">
                <div className="ga-suggestions-title">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                  </svg>
                  <span>猜你想问 · 当前场景考据</span>
                </div>
                <div className="ga-suggestions-list">
                  {currentSuggestions.map((item, i) => (
                    <button
                      key={i}
                      className="ga-suggestion-chip"
                      onClick={() => handleSendMessage(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 底部缓冲空间：确保最长内容滚动到底部绝不被输入框遮挡 */}
            <div className="ga-chat-bottom-anchor" style={{ height: '24px', flexShrink: 0 }} />
            <div ref={historyEndRef} />
          </div>

          {/* 底部一体化输入区 */}
          <div className="ga-chat-input-island">
            <div className="ga-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                aria-label="向问窟者提问"
                placeholder={isStreaming ? '问窟者正在考据推演中…' : '向问窟者提问（如：舍利塔飞天有何特点？）'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSendMessage()}
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button
                  className="ga-btn-stop"
                  onClick={() => {
                    abortControllerRef.current?.abort()
                    setIsStreaming(false)
                  }}
                  title="停止推演"
                  aria-label="停止推演"
                >
                  <span className="ga-stop-square" />
                </button>
              ) : (
                <button
                  className={`ga-btn-send ${inputText.trim() ? 'is-active' : ''}`}
                  aria-label="发送问题"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="ga-input-footnote">
              由 DeepSeek-R1 / Flash 推演 · 内容基于 73 篇学术文献数字化归档
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
