import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './LiteratureLibrary.css'

const API_BASE = import.meta.env.VITE_AGENT_API || ''

interface LiteratureLibraryProps {
  onBack: () => void
  /** 从 AI 引用跳转过来时自动选中的文献标题 */
  autoSelectTitle?: string | null
  /** RAG 片段文本，用于段落定位 */
  autoScrollSnippet?: string | null
}

interface DocMeta {
  id: string
  title: string
  filename: string
  type: string
}

interface DocSummary {
  summary: string
  keywords: string[]
}

// 用于区分摘要状态的枚举
type SummaryState = 'idle' | 'loading' | 'success' | 'error'

export function LiteratureLibrary({ onBack, autoSelectTitle, autoScrollSnippet }: LiteratureLibraryProps) {
  const [activeDoc, setActiveDoc] = useState<DocMeta | null>(null)
  const [activeDocContent, setActiveDocContent] = useState<string>('')
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const readerRef = useRef<HTMLDivElement>(null)

  // AI 摘要：用单一 state 管理所有状态，避免多 state 竞争
  const [summaryState, setSummaryState] = useState<SummaryState>('idle')
  const [summaryData, setSummaryData] = useState<DocSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string>('')

  // 拉取文献列表
  useEffect(() => {
    fetch(`${API_BASE}/api/literature`)
      .then(res => res.json())
      .then(data => {
        setDocs(data)
        setLoading(false)

        // 如果有自动选中标题，模糊匹配并选中对应文献
        if (autoSelectTitle && data.length > 0) {
          const normalizedTarget = autoSelectTitle.toLowerCase().replace(/[\s_]/g, '')
          const matched = data.find((d: DocMeta) => {
            const normalizedTitle = d.title.toLowerCase().replace(/[\s_]/g, '')
            // 完全包含 或 包含关系
            return normalizedTitle.includes(normalizedTarget) ||
                   normalizedTarget.includes(normalizedTitle)
          })
          if (matched) {
            setActiveDoc(matched)
          }
        }
      })
      .catch(() => setLoading(false))
  }, [autoSelectTitle])

  // 切换文献时自动加载原文和预缓存的摘要
  useEffect(() => {
    if (!activeDoc) return
    setSummaryState('loading')
    setSummaryData(null)
    setSummaryError('')
    setContentLoading(true)

    // 并发请求原文和预缓存的摘要
    Promise.all([
      fetch(`${API_BASE}/api/literature/${encodeURIComponent(activeDoc.filename)}`).then(res => res.text()),
      fetch(`${API_BASE}/api/literature/summarize/${encodeURIComponent(activeDoc.filename)}`).then(res => res.json())
    ])
      .then(([text, summaryJson]) => {
        setActiveDocContent(text)
        setContentLoading(false)

        if (summaryJson.error) {
          setSummaryError(summaryJson.error)
          setSummaryState('error')
        } else {
          setSummaryData(summaryJson)
          setSummaryState('success')
        }
      })
      .catch(err => {
        setActiveDocContent('加载失败')
        setContentLoading(false)
        setSummaryError(String(err))
        setSummaryState('error')
      })
  }, [activeDoc])

  // 文献内容加载完成后，如果有 snippet，在 DOM 中搜索并滚动定位
  useEffect(() => {
    if (!autoScrollSnippet || contentLoading || !activeDocContent || !readerRef.current) return

    // 等待 ReactMarkdown 渲染完成
    const timer = setTimeout(() => {
      const container = readerRef.current
      if (!container) return

      // 取 snippet 前 30 个字作为搜索关键词（去掉空格和换行）
      const searchText = autoScrollSnippet
        .replace(/\s+/g, '')
        .slice(0, 30)

      // 遍历所有文本节点，找到包含该片段的元素
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      )

      let targetNode: Node | null = null
      while (walker.nextNode()) {
        const nodeText = (walker.currentNode.textContent || '').replace(/\s+/g, '')
        if (nodeText.includes(searchText)) {
          targetNode = walker.currentNode
          break
        }
      }

      if (targetNode && targetNode.parentElement) {
        const el = targetNode.parentElement
        // 添加高亮样式
        el.classList.add('ll-highlight-snippet')
        // 滚动到该元素
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 5 秒后移除高亮
        setTimeout(() => el.classList.remove('ll-highlight-snippet'), 5000)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [autoScrollSnippet, contentLoading, activeDocContent])

  return (
    <div className="literature-library">
      {/* 顶部导航 */}
      <nav className="ll-nav">
        <button className="ll-nav__back" onClick={onBack} aria-label="返回上层">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>返回枢纽</span>
        </button>
        <div className="ll-nav__title">
          <span className="ll-nav__title-main">问窟 · 文献库</span>
          <span className="ll-nav__title-sub">LITERATURE ARCHIVE</span>
        </div>
      </nav>

      {/* 核心布局 */}
      <div className="ll-container">
        {/* 左侧：文献列表 */}
        <aside className="ll-sidebar">
          <div className="ll-sidebar__header">
            <h3>典籍档案库</h3>
            <span className="ll-count">{docs.length} 卷</span>
          </div>
          <div className="ll-list">
            {loading ? (
              <div className="ll-list-item"><p>加载中...</p></div>
            ) : (
              docs.map(doc => (
                <div
                  key={doc.id}
                  className={`ll-list-item ${activeDoc?.id === doc.id ? 'll-list-item--active' : ''}`}
                  onClick={() => setActiveDoc(doc)}
                >
                  <div className="ll-list-item__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="ll-list-item__content">
                    <h4>{doc.title}</h4>
                    <p>格式：{doc.type.replace('SourceType.', '')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* 右侧：阅读区 */}
        <main className="ll-content">
          {!activeDoc ? (
            <div className="ll-content__empty">
              <div className="ll-content__empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(246,206,160,0.3)" strokeWidth="1">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <p>请在左侧选择文献进行深度阅读</p>
            </div>
          ) : (
            <div className="ll-content__reader">

              {/* ——— 标题行 ——— */}
              <div className="ll-reader__title-row">
                <h2 className="ll-reader__title">{activeDoc.title}</h2>
              </div>

              {/* ——— AI 来源指南展开区 ——— */}
              {summaryState === 'loading' && (
                <div className="ll-guide-card ll-guide-card--loading" style={{ padding: '20px', textAlign: 'center', color: 'rgba(246,206,160,0.6)' }}>
                  <span className="ll-btn-spinner" style={{ marginRight: '8px' }} />
                  正在提取智能导读...
                </div>
              )}

              {summaryState === 'error' && (
                <div className="ll-guide-error">
                  ⚠️ AI 导读加载失败：{summaryError}
                </div>
              )}

              {summaryState === 'success' && summaryData && (
                <div className="ll-guide-card">
                  <div className="ll-guide-card__header" style={{ cursor: 'default' }}>
                    <div className="ll-guide-card__label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      <span>来源指南</span>
                    </div>
                  </div>
                  <div className="ll-guide-card__body">
                    <div className="ll-guide-card__summary">
                      <ReactMarkdown>{summaryData.summary}</ReactMarkdown>
                    </div>
                    {summaryData.keywords?.length > 0 && (
                      <div className="ll-guide-card__keywords">
                        {summaryData.keywords.map((kw, i) => (
                          <span key={i} className="ll-keyword-pill">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ——— 分隔线 ——— */}
              <div className="ll-divider" />

              {/* ——— 文献原文 ——— */}
              <div className="ll-reader__body" ref={readerRef}>
                <div className="ll-reader__text">
                  {contentLoading ? (
                    <p>正在拉取档案源文件...</p>
                  ) : activeDocContent ? (
                    <ReactMarkdown
                      components={{
                        img: ({ src, alt }) => {
                          // 确保加载后端服务的静态图片
                          const fullSrc = src?.startsWith('/static/') 
                            ? `${API_BASE}${src}` 
                            : src;
                          return (
                            <img
                              src={fullSrc}
                              alt={alt || '插图'}
                              style={{ maxWidth: '100%', borderRadius: '6px', margin: '12px 0', display: 'block' }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          );
                        },
                      }}
                    >
                      {activeDocContent}
                    </ReactMarkdown>
                  ) : (
                    <p>该档案无文本记录</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
