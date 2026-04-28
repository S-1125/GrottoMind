import { useEffect, useRef, useState } from 'react'

interface DeepReadArticleProps {
  onBack: () => void
}

export function DeepReadArticle({ onBack }: DeepReadArticleProps) {
  const [visible, setVisible] = useState(false)
  
  useEffect(() => {
    // 延迟一帧触发淡入，配合黑屏转场
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`deep-read-article ${visible ? 'is-visible' : ''}`}>
      <button className="back-btn interactive" onClick={onBack}>
        <span aria-hidden="true">←</span>
        返回展览
      </button>

      <div className="article-layout">
        <aside className="article-sticky-media">
          {/* 占位图，后续可替换为单色历史底图 */}
          <div className="media-placeholder" />
        </aside>
        
        <main className="article-content">
          <header>
            <span className="article-kicker">第一章 · 深度阅读</span>
            <h1>舍利塔上的时光印记</h1>
            <i className="article-divider" />
          </header>
          
          <div className="article-body">
            <p className="lead">
              栖霞山舍利塔作为南朝佛教石刻艺术的巅峰之作，其每一层石雕都凝结着匠人的心血与岁月的沉淀。
            </p>
            <p>
              （此处为图文长文章内容占位。根据设计文档，当用户点击右侧“深度阅读”时，会通过全屏黑屏过渡进入这个 2D 图文页面。左侧是固定的高清历史图像，右侧是可滚动的深度解析文本。）
            </p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
