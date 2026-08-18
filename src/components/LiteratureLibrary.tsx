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
  /** RAG 原始绝对行号，用于行级精准直达 */
  autoScrollLine?: number | null
}

interface DocMeta {
  id: string
  title: string
  filename: string
  type: string
  source?: string
}

interface DocSummary {
  summary: string
  keywords: string[]
}

// 用于区分摘要状态的枚举
type SummaryState = 'idle' | 'loading' | 'success' | 'error'

/** 智能模糊匹配文献标题（支持简称、部分书名、作者后缀剥离与 N-Gram 重合度打分） */
function findBestMatchingDoc(targetTitle: string, docList: DocMeta[]): DocMeta | null {
  if (!targetTitle || !docList.length) return null

  const cleanTarget = targetTitle.toLowerCase().replace(/[\s_《》·\(\)（）—\-:：]/g, '')
  if (!cleanTarget) return null

  // 1. 精确与包含匹配
  for (const doc of docList) {
    const cleanDoc = doc.title.toLowerCase().replace(/[\s_《》·\(\)（）—\-:：]/g, '')
    if (cleanDoc.includes(cleanTarget) || cleanTarget.includes(cleanDoc)) {
      return doc
    }
  }

  // 2. 连续片段与字符重叠度模糊匹配
  let bestDoc: DocMeta | null = null
  let maxScore = 0

  for (const doc of docList) {
    const cleanDoc = doc.title.toLowerCase().replace(/[\s_《》·\(\)（）—\-:：]/g, '')
    
    // 提取连续 3-4 字符片段匹配
    let matchPoints = 0
    for (let i = 0; i <= cleanTarget.length - 3; i++) {
      const sub = cleanTarget.slice(i, i + 3)
      if (cleanDoc.includes(sub)) {
        matchPoints += 3
      }
    }

    // 关键字符重叠率
    const targetChars = new Set(cleanTarget.split(''))
    let commonChars = 0
    for (const ch of targetChars) {
      if (cleanDoc.includes(ch)) commonChars++
    }
    const overlapRate = commonChars / targetChars.size

    const totalScore = matchPoints + overlapRate * 15
    if (totalScore > maxScore && (overlapRate >= 0.35 || matchPoints >= 6)) {
      maxScore = totalScore
      bestDoc = doc
    }
  }

  return bestDoc
}

export function LiteratureLibrary({ onBack, autoSelectTitle, autoScrollSnippet, autoScrollLine }: LiteratureLibraryProps) {
  const [activeDoc, setActiveDoc] = useState<DocMeta | null>(null)
  const [activeDocContent, setActiveDocContent] = useState<string>('')
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [locatedLine, setLocatedLine] = useState<number | null>(null)
  const readerRef = useRef<HTMLDivElement>(null)
  const contentContainerRef = useRef<HTMLDivElement>(null)

  // AI 摘要：用单一 state 管理所有状态，避免多 state 竞争
  const [summaryState, setSummaryState] = useState<SummaryState>('idle')
  const [summaryData, setSummaryData] = useState<DocSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string>('')

  // 1. 初始化拉取文献列表
  useEffect(() => {
    fetch(`${API_BASE}/api/literature`)
      .then(res => res.json())
      .then(data => {
        setDocs(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // 2. 监听 autoSelectTitle 或 docs 变化，智能匹配并激活对应文献
  useEffect(() => {
    if (!autoSelectTitle || !docs.length) return
    const matched = findBestMatchingDoc(autoSelectTitle, docs)
    if (matched) {
      setActiveDoc(matched)
    }
  }, [autoSelectTitle, docs])

  // 3. 切换文献时自动加载原文与预缓存摘要
  useEffect(() => {
    if (!activeDoc) return
    setSummaryState('loading')
    setSummaryData(null)
    setSummaryError('')
    setContentLoading(true)
    setLocatedLine(null)

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

  // 4. 精准行号与文本切片双模态定位控制器 (支持多轮排版校准)
  useEffect(() => {
    if ((!autoScrollSnippet && !autoScrollLine) || contentLoading || !activeDocContent) return

    const performLocation = () => {
      const container = readerRef.current
      const scrollParent = contentContainerRef.current
      if (!container || !scrollParent) return false

      const textContainer = container.querySelector('.ll-reader__text')
      if (!textContainer) return false

      const blockElements = textContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, td')
      if (!blockElements.length) return false

      let bestMatch: Element | null = null
      let bestScore = 0

      // 方案 A: 依据 autoScrollSnippet 提取特征文本打分
      if (autoScrollSnippet) {
        const cleanSnippet = autoScrollSnippet.replace(/[#*`_>~]/g, '').replace(/\s+/g, '')
        const fragments = [
          cleanSnippet.slice(0, 30),
          cleanSnippet.slice(15, 45),
          cleanSnippet.slice(30, 60),
          cleanSnippet.slice(cleanSnippet.length - 30),
        ].filter(f => f.length >= 8)

        blockElements.forEach(el => {
          const elText = (el.textContent || '').replace(/[#*`_>~]/g, '').replace(/\s+/g, '')
          if (elText.length < 5) return

          let score = 0
          for (const frag of fragments) {
            if (elText.includes(frag)) score += frag.length * 2
          }
          if (elText.includes(cleanSnippet.slice(0, 15))) score += 40

          if (score > bestScore) {
            bestScore = score
            bestMatch = el
          }
        })
      }

      // 方案 B: 依据 autoScrollLine 估算行号对应比例的 DOM 节点
      if ((!bestMatch || bestScore < 15) && autoScrollLine && autoScrollLine > 1) {
        const lines = activeDocContent.split('\n')
        const totalLines = lines.length
        const targetRatio = Math.min(Math.max(autoScrollLine / totalLines, 0), 1)
        const targetIndex = Math.min(Math.floor(targetRatio * blockElements.length), blockElements.length - 1)
        bestMatch = blockElements[targetIndex]
      }

      if (bestMatch) {
        const el = bestMatch as HTMLElement
        // 移除旧的高亮
        container.querySelectorAll('.ll-highlight-snippet').forEach(node => node.classList.remove('ll-highlight-snippet'))
        
        // 注入高亮类名与锚点
        el.classList.add('ll-highlight-snippet')
        
        // 双重滚动保障：先通过 offsetTop 显式滚动 scrollParent，再执行 scrollIntoView
        const containerRect = scrollParent.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const targetScrollTop = scrollParent.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 3)
        
        scrollParent.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        })
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })

        if (autoScrollLine) {
          setLocatedLine(autoScrollLine)
        }
        return true
      }
      return false
    }

    // 采用 100ms, 350ms, 700ms, 1200ms 四轮渐进校准，确保排版稳定后精准定格
    const t1 = setTimeout(performLocation, 100)
    const t2 = setTimeout(performLocation, 350)
    const t3 = setTimeout(performLocation, 700)
    const t4 = setTimeout(performLocation, 1200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [autoScrollSnippet, autoScrollLine, contentLoading, activeDocContent])

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
      <div className={`ll-container ${activeDoc ? 'has-active-doc' : ''}`}>
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
        <main className="ll-content" ref={contentContainerRef}>
          {!activeDoc ? (
            <div className="ll-content__empty">
              <div className="ll-content__empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <p>请在左侧选择文献进行深度阅读</p>
            </div>
          ) : (
            <div className="ll-content__reader">
              {/* 移动端专属：返回文献列表 */}
              <button className="ll-mobile-back" onClick={() => setActiveDoc(null)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                返回列表
              </button>

              {/* 引用行号精准定位提示条 */}
              {locatedLine && (
                <div
                  className="ll-citation-anchor-badge"
                  onClick={() => {
                    readerRef.current?.querySelector('.ll-highlight-snippet')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  title="点击可再次居中视口至论据出处"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                  <span>已定位至 AI 引述核心论据出处（第 {locatedLine} 行）</span>
                  <span className="ll-anchor-action">点击居中 ↗</span>
                </div>
              )}

              {/* ——— 标题行 ——— */}
              <div className="ll-reader__title-row">
                <h2 className="ll-reader__title">{activeDoc.title}</h2>
              </div>

              {/* ——— AI 来源指南展开区 ——— */}
              {summaryState === 'loading' && (
                <div className="ll-guide-card ll-guide-card--loading" style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  <span className="ll-btn-spinner" style={{ marginRight: '8px' }} />
                  正在提取智能导读...
                </div>
              )}

              {summaryState === 'error' && (
                <div className="ll-guide-error">
                  导读加载提示：{summaryError}
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
                    {summaryData.keywords && summaryData.keywords.length > 0 && (
                      <div className="ll-guide-card__tags">
                        {summaryData.keywords.map((kw, i) => (
                          <span key={i} className="ll-guide-tag">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ——— 分隔线 ——— */}
              <div className="ll-divider" />

              {/* ——— 文献原文阅读区 ——— */}
              <div className="ll-reader__body" ref={readerRef}>
                <div className="ll-reader__text">
                  {contentLoading ? (
                    <p>正在拉取档案源文件...</p>
                  ) : activeDocContent && activeDocContent.replace(/!\[.*?\]\(.*?\)/g, '').trim().length > 0 ? (
                    <ReactMarkdown
                      components={{
                        img: ({ src, alt }) => {
                          if (!src) return null
                          return (
                            <img
                              src={src}
                              alt={alt || ''}
                              className="ll-inline-md-img"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none'
                              }}
                            />
                          )
                        }
                      }}
                    >
                      {activeDocContent}
                    </ReactMarkdown>
                  ) : (
                    <div className="ll-empty-scan-note">
                      <div className="ll-empty-seal">〔 影印扫描卷宗 〕</div>
                      <p>本卷为历史原版影印扫描归档文献，原始档案未包含可提取纯文本字符。</p>
                      <p>核心考据结论与关键学术线索已由 AI 深度索引，您可直接向“问窟者”智能体咨询考据细节。</p>
                    </div>
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
