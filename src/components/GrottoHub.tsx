import { useState, useRef, useCallback, useEffect } from 'react'
import { useAgent } from './agent/AgentContext'
import { LiteratureLibrary } from './LiteratureLibrary'
import { parseColorCards, ColorCardGroup } from './ColorCard'
import ReactMarkdown from 'react-markdown'
import './GrottoHub.css'

/* ============================================================
   GrottoHub: 第三章 · 问窟枢纽
   以 AI 球体为视觉核心的全屏交互场景
============================================================ */

interface GrottoHubProps {
  onBack: () => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const STORAGE_KEY = 'grottomind_chat_history'
const API_BASE = import.meta.env.VITE_AGENT_API || ''

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

export function GrottoHub({ onBack }: GrottoHubProps) {
  const { setOrbVisible, currentChapter, pendingLiteratureNav, setPendingLiteratureNav } = useAgent()
  const [view, setView] = useState<'hub' | 'literature'>('hub')
  const [autoSelectTitle, setAutoSelectTitle] = useState<string | null>(null)
  const [autoScrollSnippet, setAutoScrollSnippet] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyEndRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  // 监听从 GlobalAgent 引用跳转过来的信号
  useEffect(() => {
    if (pendingLiteratureNav && currentChapter === 'ch3') {
      setAutoSelectTitle(pendingLiteratureNav.title)
      setAutoScrollSnippet(pendingLiteratureNav.snippet || null)
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
          content: '⚠️ 后端未启动。请运行：cd server && python3 main.py'
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [inputText, isStreaming, messages])

  // 如果是文献库二级页面
  if (view === 'literature') {
    return <LiteratureLibrary onBack={() => { setAutoSelectTitle(null); setAutoScrollSnippet(null); setView('hub') }} autoSelectTitle={autoSelectTitle} autoScrollSnippet={autoScrollSnippet} />
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

        <button className="gh-nav__lit" onClick={() => setView('literature')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          文献库
        </button>
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
                  <div className="gh-thinking-label">石壁显影中</div>
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
                      return (
                        <span
                          className="ga-citation"
                          data-tooltip={sourceTitle}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setPendingLiteratureNav({ title: sourceTitle })
                            setView('literature')
                          }}
                        >{props.children}</span>
                      )
                    }
                    if (props.href?.startsWith('#')) return <span className="ga-citation-plain">{props.children}</span>
                    return <a {...props} />
                  }
                }}>{cleanText}</ReactMarkdown>
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
                        return (
                          <span
                            className="ga-citation"
                            data-tooltip={sourceTitle}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setPendingLiteratureNav({ title: sourceTitle })
                              setView('literature')
                            }}
                          >{props.children}</span>
                        )
                      }
                      if (props.href?.startsWith('#')) return <span className="ga-citation-plain">{props.children}</span>
                      return <a {...props} />
                    }
                  }}>{cleanText}</ReactMarkdown>
                </div>
                <ColorCardGroup cards={cards} />
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
            <h2 className="gh-manuscript-title">发问志</h2>
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
                                return (
                                  <span
                                    className="ga-citation"
                                    data-tooltip={sourceTitle}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setShowHistory(false)
                                      setPendingLiteratureNav({ title: sourceTitle })
                                      setView('literature')
                                    }}
                                  >{props.children}</span>
                                )
                              }
                              if (props.href?.startsWith('#')) return <span className="ga-citation-plain">{props.children}</span>
                              return <a {...props} />
                            }
                          }}>{cleanText}</ReactMarkdown>
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

      {/* ——— 隐匿式底部交互栏 ——— */}
      <div className="gh-stealth-input-area">
        <div className="gh-stealth-input-wrapper">
          <button
            className="gh-history-toggle"
            onClick={() => setShowHistory(true)}
            title="文献回溯"
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
            placeholder={isStreaming ? '石壁显影中...' : '向石窟发问...'}
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
    </div>
  )
}
