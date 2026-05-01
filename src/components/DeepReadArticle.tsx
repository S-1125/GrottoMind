import { useEffect, useRef, useState } from 'react'

/* ============================================================
   画廊内容数据：按 Timeline 节点 ID 分组的专业学术内容
   布局类型:
     - 'hero'      : 开篇大标题
     - 'text'      : 纯文本阅读卡片
     - 'image'     : 单图卡片
     - 'dual-image': 并排双图卡片
============================================================ */

type GalleryCard = 
  | { type: 'hero'; title: string; subtitle: string; body?: string; width?: string; align?: 'start' | 'center' | 'end' }
  | { type: 'text'; kicker: string; title: string; body: string; caption?: string; note?: string; reference?: string; width?: string; align?: 'start' | 'center' | 'end' }
  | { type: 'image'; src: string; caption: string; width?: string; height?: string; align?: 'start' | 'center' | 'end' }
  | { type: 'dual-image'; images: { src: string; caption: string }[]; width?: string; height?: string; align?: 'start' | 'center' | 'end' }
  | { type: 'gallery'; kicker: string; title: string; intro: string; items: { image: string; label: string; desc: string }[]; width?: string; align?: 'start' | 'center' | 'end' }

const nodeContentMap: Record<string, GalleryCard[]> = {
  // ---- 0. 开篇 / 综述 ----
  'intro': [
    { type: 'hero', title: '舍利塔上的\n时光印记', subtitle: '栖霞山舍利塔 · 南唐 · 公元945—965年' },
    { type: 'text', kicker: 'OVERVIEW', title: '垂直的精神坐标', body: '1400年前，金陵栖霞山立起一座承载信仰与时间的舍利塔。它把佛塔建筑、造像题材与山寺空间压缩在同一座垂直的精神坐标中。数字化漫游的意义不只是放大局部，而是在风化、残损与重建之间重新建立观看顺序。' },
    { type: 'image', src: '/章节1图片素材/门.webp', caption: '假门浮雕，暗示着通往佛国空间的入口', width: '22vw' },
    { type: 'text', kicker: 'POLYCHROME', title: '失落的金碧', body: '我们今天看到的浮雕皆为斑驳灰色石材，但在南唐初建时，这些造像表面采用了"敷金涂彩"的皇家工艺——背景深处大面积使用石青（蓝铜矿）铺设法界虚空，释迦面部以铅白与金箔提亮，衣着轮廓点缀鲜艳的朱砂。' },
  ],

  // ---- 1. 塔刹 ----
  'finial': [
    { type: 'hero', title: '仰望天际\n的信仰', subtitle: 'THE FINIAL' },
    { type: 'image', src: '/章节1图片素材/塔刹.webp', caption: '舍利塔最顶端的塔刹由六重石头叠置而成', width: '25vw' },
    { type: 'text', kicker: 'STRUCTURE', title: '冲天而起的莲花', body: '塔刹由覆钵、仰莲、相轮、宝盖、宝珠组成，象征着佛法无边无际。匠人们巧妙地利用石块层层叠压，保证了千年不倒的稳固。' }
  ],

  // ---- 2. 密檐 ----
  'eaves': [
    { type: 'hero', title: '八角五层，\n石仿木构', subtitle: 'EAVES AND ARCHITECTURE' },
    { type: 'image', src: '/章节1图片素材/塔檐.webp', caption: '密檐挑出较远且逐层递减收分，整体比例端庄雄伟。', width: '45vw', align: 'center' },
    { type: 'text', kicker: 'CRAFTSMANSHIP', title: '以石为木', body: '密檐部分的雕刻极尽写实之能事，飞檐、斗拱、瓦当均用沉重的石材一比一仿造了当时的木构建筑，是研究五代木构建筑极具价值的立体史料。' }
  ],

  // ---- 3. 佛龛 ----
  'niche': [
    { type: 'hero', title: '凝石为法：\n塔身佛龛', subtitle: 'THE NICHES' },
    { type: 'image', src: '/章节1图片素材/佛龛.webp', caption: '塔身佛龛以层级方式分布', width: '28vw' },
    { type: 'image', src: '/章节1图片素材/飞天2.webp', caption: '佛龛两侧的浮雕飞天', width: '20vw' },
    { type: 'text', kicker: 'ART', title: '秀骨清像', body: '佛龛周围的飞天与天人，衣带飞舞，线条极为流畅。南唐匠人在坚硬的岩石上完美复现了顾恺之时代的“春蚕吐丝”般的柔美线条，令人叹为观止。' }
  ],

  // ---- 4. 天王 ----
  'guardian': [
    { type: 'hero', title: '四大天王：\n武力护法的具象', subtitle: 'GUARDIAN KINGS', body: '在基座的四个对角，雕刻着怒目圆睁的四大天王。他们是佛法的守护神，更展现了五代武将圆雕技法。', align: 'center' },
    
    // 南方增长天王
    { type: 'image', src: '/章节1图片素材/天王-1.webp', caption: '南方增长天王（局部细节）', width: '22vw', align: 'start' },
    { type: 'text', kicker: 'SOUTH', title: '南方增长天王', body: '南方天王身披重甲，双手拄剑，脚踏夜叉。其面部肌肉紧绷，怒目圆睁，极具力量感，深受唐代武将造像风格影响。', reference: '等待 NotebookLM 数据注入...' },
    
    // 西方广目天王
    { type: 'image', src: '/章节1图片素材/天王-2.webp', caption: '西方广目天王（局部细节）', width: '22vw', align: 'end' },
    { type: 'text', kicker: 'WEST', title: '西方广目天王', body: '手缠赤龙，司顺，探讨西域文化在江南的融合。', reference: '等待 NotebookLM 数据注入...' },
    
    // 北方多闻天王
    { type: 'image', src: '/章节1图片素材/天王3.webp', caption: '北方多闻天王（局部细节）', width: '20vw', align: 'center' },
    { type: 'text', kicker: 'NORTH', title: '北方多闻天王', body: '铠甲鳞片雕刻入微，胸前有兽面吞口。南唐匠人利用石材的自然肌理，使得天王的战袍在僵硬的岩石中显出一种粗粝的动态之美。', reference: '等待 NotebookLM 数据注入...' },
    
    // 东方持国天王
    { type: 'image', src: '/章节1图片素材/天王4.webp', caption: '东方持国天王（局部细节）', width: '24vw', align: 'start' },
    { type: 'text', kicker: 'EAST', title: '东方持国天王', body: '怀抱琵琶，司调，分析雕刻中乐器细节的写实性。', reference: '等待 NotebookLM 数据注入...' }
  ],

  // ---- 5. 普贤菩萨 ----
  'bodhisattva': [
    { type: 'hero', title: '六牙白象\n与大行菩萨', subtitle: 'BODHISATTVA SAMANTABHADRA' },
    { type: 'image', src: '/章节1图片素材/普贤菩萨.webp', caption: '普贤菩萨跏趺坐于六牙白象背负的莲台上', width: '38vw', align: 'center' },
    { type: 'text', kicker: 'COMPASSION', title: '大行无疆', body: '普贤菩萨神态安详，白象则敦厚稳重。动与静、人与兽的完美结合，展现了菩萨的大慈大悲与大行无疆。' },
    { type: 'image', src: '/章节1图片素材/文殊菩萨-已缺失.webp', caption: '另一侧的文殊菩萨现已佚失，仅在斑驳的崖壁上留下少许残存印记', width: '24vw', align: 'start' }
  ],

  // ---- 6. 须弥座 ----
  'base': [
    { type: 'hero', title: '海浪与瑞兽\n的交响', subtitle: 'SUMERU THRONE AND BASE' },
    { type: 'image', src: '/章节1图片素材/塔基与须弥座.webp', caption: '束腰处大面积浮雕了翻滚的海水与瑞兽', width: '42vw', align: 'center' },
    { type: 'text', kicker: 'WATER & BEAST', title: '翻涌的基石', body: '南唐工匠在束腰处大面积浮雕了翻滚的海水与神异的瑞兽。水纹波涛汹涌，与上方端庄肃穆的佛国世界形成了强烈的动静对比。' },
    { type: 'image', src: '/章节1图片素材/龙.webp', caption: '腾出水面的瑞龙浮雕', width: '22vw', align: 'end' },
    { type: 'image', src: '/章节1图片素材/题记.webp', caption: '刻于须弥座上的珍贵造塔题记', width: '9vw', align: 'start' },
    { type: 'text', kicker: 'INSCRIPTION', title: '历史的印记', body: '题记铭文，记录了当年建塔的资助者与工匠的名字，它是破解这件南朝余韵作品真实年代的核心密码。' }
  ],

  // ---- 7. 八相成道图 ----
  'story': [
    { type: 'hero', title: '佛传史诗：\n八相成道', subtitle: 'EIGHT PHASES OF THE BUDDHA' },
    { type: 'gallery', kicker: 'NARRATIVE', title: '连续的时空长卷', intro: '束腰八面以连续叙事组织佛传：西北面"降兜率天"，北面"树下诞生"，依次展开，生动地复现了悉达多太子从降生到涅槃的波澜一生。', align: 'center',
      items: [
        { image: '/章节1图片素材/八相成道图-1.webp', label: '降兜率天', desc: '乘六牙白象降下兜率天宫' },
        { image: '/章节1图片素材/八相成道图-2.webp', label: '树下诞生', desc: '右胁诞生与九龙灌浴' },
        { image: '/章节1图片素材/八相成道图-3.webp', label: '出游四门', desc: '见老病死萌生出家之念' },
        { image: '/章节1图片素材/八相成道图-4.webp', label: '逾城出家', desc: '深夜离宫割发贸衣' },
        { image: '/章节1图片素材/八相成道图-5.webp', label: '禅河澡浴', desc: '洗去污垢受牧女献糜' },
        { image: '/章节1图片素材/八相成道图-6.webp', label: '成道', desc: '菩提树下悟道受四王献钵' },
        { image: '/章节1图片素材/八相成道图-7.webp', label: '降魔', desc: '降伏魔军初转法轮' },
        { image: '/章节1图片素材/八相成道图-8.webp', label: '涅槃', desc: '双树入灭圣火荼毗' }
      ]
    }
  ]
}
/* ============================================================
   组件类型定义
============================================================ */
interface DeepReadArticleProps {
  nodeId: string
  onBack: () => void
}

/* ============================================================
   DeepReadArticle: 自由滑动的卡片画廊
============================================================ */
export function DeepReadArticle({ nodeId, onBack }: DeepReadArticleProps) {
  const [visible, setVisible] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  // 获取当前节点对应的内容，如果没有匹配则默认显示 intro
  const cards = nodeContentMap[nodeId] || nodeContentMap['intro']

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  // 支持滚轮自由横向滚动
  useEffect(() => {
    const el = galleryRef.current
    if (!el || !trackRef.current) return
    const handler = (e: globalThis.WheelEvent) => {
      // 检查是否正在水平滚动内层元素（比如多图画廊内部），如果是，则不拦截
      // 为了简单起见，我们直接将垂直滚动映射为外层 track 的水平滚动
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        trackRef.current!.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // 键盘导航
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!trackRef.current) return
      const amount = window.innerWidth / 2
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        trackRef.current.scrollBy({ left: amount, behavior: 'smooth' })
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        trackRef.current.scrollBy({ left: -amount, behavior: 'smooth' })
      }
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onBack])

  return (
    <div ref={galleryRef} className={`deep-read-gallery ${visible ? 'is-visible' : ''}`}>
      {/* 顶部技术网格栏 */}
      <header className="gallery-topbar">
        <div className="topbar-left">
          <span className="tech-text">DATABASE // CH-01</span>
          <span className="tech-text coords">36.7783° N, 119.4179°</span>
        </div>
        <button className="gallery-close-btn interactive" onClick={onBack}>
          关闭
          <span className="gallery-close-icon" aria-hidden="true">✕</span>
        </button>
      </header>

      {/* 底部技术网格栏 */}
      <footer className="gallery-bottombar">
        <span className="tech-text">NODE: {nodeId.toUpperCase()}</span>
        <div className="scroll-indicator">
          <span className="tech-text">SCROLL</span>
          <span className="indicator-line"></span>
        </div>
        <span className="tech-text live-status"><span className="status-dot"></span>ACTIVE</span>
      </footer>

      {/* 自由横向滑动轨道 */}
      <div className="gallery-scroll-track" ref={trackRef}>
        {cards.map((card, i) => (
          <div className="gallery-card-wrapper" key={i} style={getWrapperStyle(card.align)}>
            {renderCard(card)}
          </div>
        ))}
        {/* 结尾附加卡片 */}
        <div className="gallery-card-wrapper end-card">
          <div className="card-closing-subtle">
            <h3 className="closing-title">探索更多</h3>
            <button className="interactive btn-editorial-subtle" onClick={onBack}>返回展览</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   渲染各类型卡片
============================================================ */
// 辅助函数：将对其属性应用到外部 Wrapper
function getWrapperStyle(align?: 'start' | 'center' | 'end') {
  if (align === 'center') {
    return { alignSelf: 'center', marginTop: 0 }
  }
  if (align === 'end') {
    return { alignSelf: 'flex-end', marginBottom: '8vh' }
  }
  return { alignSelf: 'flex-start', marginTop: '32vh' }
}

function getInnerStyle(customWidth?: string) {
  return { width: customWidth }
}

function renderCard(card: GalleryCard) {
  switch (card.type) {
    case 'hero':
      return (
        <div className="card-hero" style={getInnerStyle(card.width || '22vw')}>
          <span className="card-hero-subtitle">{card.subtitle}</span>
          <h1 className="card-hero-title">{card.title}</h1>
          {card.body && <p className="card-hero-body">{card.body}</p>}
        </div>
      )

    case 'text':
      return (
        <div className="card-text" style={getInnerStyle(card.width || '25vw')}>
          <span className="card-kicker">{card.kicker}</span>
          <h2 className="card-title">{card.title}</h2>
          <div className="card-divider" />
          <p className="card-body">{card.body}</p>
          {card.caption && <p className="card-caption">{card.caption}</p>}
          {card.note && <blockquote className="card-note">{card.note}</blockquote>}
          {card.reference && (
            <div className="card-reference">
              <span className="ref-icon">※</span>
              <span className="ref-content"> {card.reference}</span>
            </div>
          )}
        </div>
      )

    case 'image':
      return (
        <div className="card-image" style={getInnerStyle(card.width || '40vw')}>
          <div className="card-image-wrapper">
            <div className="crop-mark top-left"></div>
            <div className="crop-mark top-right"></div>
            <div className="crop-mark bottom-left"></div>
            <div className="crop-mark bottom-right"></div>
            <div className="card-image-frame">
              <img src={card.src} alt={card.caption} loading="lazy" decoding="async" />
            </div>
          </div>
          <p className="card-caption">{card.caption}</p>
        </div>
      )

    case 'dual-image':
      return (
        <div className="card-dual-image" style={getInnerStyle(card.width)}>
          {card.images.map((img, j) => (
            <figure key={j}>
              <div className="card-image-wrapper">
                <div className="crop-mark top-left"></div>
                <div className="crop-mark top-right"></div>
                <div className="crop-mark bottom-left"></div>
                <div className="crop-mark bottom-right"></div>
                <div className="card-image-frame">
                  <img src={img.src} alt={img.caption} loading="lazy" decoding="async" />
                </div>
              </div>
              <figcaption className="card-caption">{img.caption}</figcaption>
            </figure>
          ))}
        </div>
      )

    case 'gallery':
      return (
        <div className="card-gallery">
          <div className="card-text gallery-intro-text">
            <span className="card-kicker">{card.kicker}</span>
            <h2 className="card-title">{card.title}</h2>
            <div className="card-divider" />
            <p className="card-body">{card.intro}</p>
          </div>
          <div className="card-gallery-grid">
            {card.items.map((item, j) => (
              <figure key={j} className="grid-item">
                <div className="card-image-frame">
                  <img src={item.image} alt={item.label} loading="lazy" decoding="async" />
                </div>
                <figcaption>
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}
