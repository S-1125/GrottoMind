/* ============================================================
   ColorCard.tsx — 色彩记忆卡片
   解析 AI 回复中的 [COLOR_CARD ...] 标记，渲染为精美的考古色彩展示块
============================================================ */

import './ColorCard.css'

interface ColorCardData {
  name: string
  hex: string
  period: string
  material: string
}

interface ColorCardProps {
  card: ColorCardData
  index: number
}

/** 解析单条 [COLOR_CARD ...] 字符串，返回结构化数据 */
export function parseColorCards(text: string): { cleanText: string; cards: ColorCardData[] } {
  const cards: ColorCardData[] = []
  const regex = /\[COLOR_CARD\s+([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const attrs = match[1]
    const getName = (key: string) => {
      const m = attrs.match(new RegExp(`${key}="([^"]*)"`, 'i'))
      return m ? m[1] : ''
    }
    cards.push({
      name: getName('name'),
      hex: getName('hex'),
      period: getName('period'),
      material: getName('material'),
    })
  }

  // 清除原始标记，仅保留正文
  const cleanText = text.replace(/\[COLOR_CARD\s+[^\]]+\]/g, '').trim()
  return { cleanText, cards }
}

/** 单张色彩卡片 */
function ColorCard({ card, index }: ColorCardProps) {
  // 计算文字颜色：根据背景亮度决定用深色还是浅色文字
  const isLight = isLightColor(card.hex)

  return (
    <div
      className="color-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* 色块主体 */}
      <div
        className="color-card__swatch"
        style={{ backgroundColor: card.hex }}
      >
        <span
          className="color-card__name"
          style={{ color: isLight ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)' }}
        >
          {card.name}
        </span>
        <span
          className="color-card__hex"
          style={{ color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)' }}
        >
          {card.hex}
        </span>
      </div>
      {/* 元信息 */}
      <div className="color-card__meta">
        <span className="color-card__period">{card.period}</span>
        <span className="color-card__material">{card.material}</span>
      </div>
    </div>
  )
}

/** 色彩卡片组（渲染一组）*/
export function ColorCardGroup({ cards }: { cards: ColorCardData[] }) {
  if (!cards.length) return null
  return (
    <div className="color-card-group">
      <div className="color-card-group__label">数字复彩推演 · 颜料谱系</div>
      <div className="color-card-group__row">
        {cards.map((card, i) => (
          <ColorCard key={i} card={card} index={i} />
        ))}
      </div>
    </div>
  )
}

/** 工具函数：判断颜色是否为亮色 */
function isLightColor(hex: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return false
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  // 相对亮度公式 (W3C)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55
}
