import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

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
  | { type: 'text'; kicker: string; title: string; body: string; caption?: string; note?: string; reference?: string;  width?: string; align?: 'start' | 'center' | 'end' }
  | { type: 'image'; src: string; caption: string; colors?: { hex: string; name: string; percentage: number }[]; width?: string; height?: string; align?: 'start' | 'center' | 'end' }
  | { type: 'dual-image'; images: { src: string; caption: string }[]; width?: string; height?: string; align?: 'start' | 'center' | 'end' }
  | { type: 'gallery'; kicker: string; title: string; intro: string; items: { image: string; label: string; desc: string }[]; colors?: { hex: string; name: string; percentage: number }[]; width?: string; align?: 'start' | 'center' | 'end' }

const nodeContentMap: Record<string, GalleryCard[]> = {
  // ---- 0. 开篇 / 综述 ----
  'intro': [
    { type: 'hero', title: '舍利塔上的\n时光印记', subtitle: '栖霞山舍利塔 · 南唐 · 公元945—965年' },
    { type: 'text', kicker: 'OVERVIEW', title: '南唐遗梦的垂直坐标', body: '这座在隋代旧址上重建的实心石塔，代表了五代十国时期江南雕塑与建筑的最高水平。它不仅是一座佛塔，更是南唐乱世中祈求庇护的精神坐标。数字化漫游的意义不只是放大局部，而是在风化与残损之间重新建立观看的秩序。', reference: '[1] 栖霞寺舍利塔历史考' },
    { type: 'image', src: '/章节1图片素材/门.webp', caption: '假门浮雕，暗示着通往佛国空间的入口', width: '22vw', colors: [{ hex: '#EAE5D9', name: '铅白', percentage: 45 }, { hex: '#E6C687', name: '泥金', percentage: 25 }, { hex: '#C1392B', name: '朱砂', percentage: 15 }, { hex: '#5F9EA0', name: '花青', percentage: 15 }] },
    { type: 'text', kicker: 'POLYCHROME', title: '失落的金碧辉煌', body: '工匠在石刻表面大量采用了极高规格的"敷金涂彩"皇家工艺。面部敷铅白、点朱砂，核心背光更覆以金箔，以极高的反光率彰显神圣，完美契合了南唐艺术所追求的"沉静妩媚"审美。', reference: '[3, 4] 栖霞造像数字复彩交互设计'},
  ],

  // ---- 1. 塔刹 ----
  'finial': [
    { type: 'hero', title: '仰望天际\n的信仰', subtitle: 'THE FINIAL' },
    { type: 'image', src: '/章节1图片素材/塔刹.webp', caption: '舍利塔最顶端的塔刹由六重石头叠置而成', width: '25vw', colors: [{ hex: '#8B4513', name: '铁赭', percentage: 60 }, { hex: '#D4AF37', name: '真金', percentage: 25 }, { hex: '#2F4F4F', name: '墨石', percentage: 15 }] },
    { type: 'text', kicker: 'STRUCTURE', title: '重构的宇宙之轴', body: '塔刹顶端的相轮暗指诸天与三宝，贯穿其中的伞柱则象征着宇宙之轴。但据梁思成考证，现存塔刹实际为1930年修葺后的形制。南唐初建时，这根直指天际的信仰之轴究竟是何模样，已随着千年的风霜化为历史的谜团。', reference: '[1-3] 印度窣堵波源流考 / 梁思成《中国建筑史》'}
  ],

  // ---- 2. 密檐 ----
  'eaves': [
    { type: 'hero', title: '八角五层，\n石仿木构', subtitle: 'EAVES AND ARCHITECTURE' },
    { type: 'image', src: '/章节1图片素材/塔檐.webp', caption: '密檐挑出较远且逐层递减收分，整体比例端庄雄伟。', width: '45vw', align: 'center', colors: [{ hex: '#A03232', name: '土朱', percentage: 50 }, { hex: '#2F4F4F', name: '墨绿', percentage: 35 }, { hex: '#EAE5D9', name: '白垩', percentage: 15 }] },
    { type: 'text', kicker: 'ARCHITECTURE', title: '无斗拱的智慧', body: '虽然匠人极为逼真地刻画了仿木的檐椽与瓦陇，但在承压处，它并未采用华而不实的石雕斗拱。正如梁思成先生所考证：其仅"出混石一层以承檐"。这种设计利用石材的力学特性，既保留了轻盈的木构视觉，又展现了南唐工匠"纳古法于新意"的绝顶聪明。', reference: '[1-3] 梁思成《中国建筑史》 / 栖霞寺舍利塔考'}
  ],

  // ---- 3. 佛龛 ----
  'niche': [
    { type: 'hero', title: '凝石为法：\n塔身佛龛', subtitle: 'THE NICHES' },
    { type: 'image', src: '/章节1图片素材/佛龛.webp', caption: '塔身佛龛以层级方式分布', width: '28vw', colors: [{ hex: '#E39B77', name: '肉色', percentage: 40 }, { hex: '#4A8F79', name: '铜绿', percentage: 30 }, { hex: '#C85A17', name: '雄黄', percentage: 20 }, { hex: '#EAE5D9', name: '铅白', percentage: 10 }] },
    { type: 'image', src: '/章节1图片素材/飞天2.webp', caption: '佛龛两侧的浮雕飞天', width: '20vw' },
    { type: 'text', kicker: 'ART', title: '秀骨清像与盛唐遗风', body: '造像身躯呈现出东晋南北朝时期典型的"褒衣博带、秀骨清像"风格，衣带飞舞间如"春蚕吐丝"。但南唐匠人并未照搬魏晋的消瘦，而是赋予了佛像丰腴饱满的晚唐面相。这种躯体与面相的跨时代融合，折射出南唐力图"复兴唐祚"的强烈时代审美诉求。', reference: '[7-9] 五代石刻艺术风格演变与审美张力'}
  ],

  // ---- 4. 天王 ----
  'guardian': [
    { type: 'hero', title: '四大天王：\n武力护法的具象', subtitle: 'GUARDIAN KINGS', body: '在基座的四个对角，雕刻着怒目圆睁的四大天王。他们是佛法的守护神，更展现了五代武将圆雕技法。', align: 'center' },
    
    // 南方增长天王
    { type: 'image', src: '/章节1图片素材/天王-1.webp', caption: '南方增长天王（局部细节）', width: '22vw', align: 'start', colors: [{ hex: '#191970', name: '青金', percentage: 35 }, { hex: '#C1392B', name: '朱砂', percentage: 30 }, { hex: '#E6C687', name: '泥金', percentage: 20 }, { hex: '#800000', name: '深赭', percentage: 15 }] },
    { type: 'text', kicker: 'SOUTH', title: '南方增长天王', body: '身披重甲，挺拔而立，脚踏挣扎的夜叉。其单手按剑，面容呈现典型西域"胡相"——鼓目、狮鼻、阔口，怒目圆睁，极具震慑力与肌肉张力。', reference: '[1] 栖霞寺舍利塔天王像法器考 / [2] 五代石刻造像神态分析'},
    
    // 西方广目天王
    { type: 'image', src: '/章节1图片素材/天王-2.webp', caption: '西方广目天王（局部细节）', width: '22vw', align: 'end', colors: [{ hex: '#C1392B', name: '朱砂', percentage: 45 }, { hex: '#2F4F4F', name: '暗青', percentage: 25 }, { hex: '#E6C687', name: '泥金', percentage: 20 }, { hex: '#4A8F79', name: '铜绿', percentage: 10 }] },
    { type: 'text', kicker: 'WEST', title: '西方广目天王', body: '身姿雄武，威灵显赫。根据同时期"敷金涂彩"的工艺规律推断，其铠甲边缘与衣纹轮廓曾以高饱和度的朱砂进行精细勾勒，在当时极具视觉冲击力。', reference: '[1] 栖霞寺舍利塔天王像法器考 / [3] 龙门石窟等彩绘推断'},
    
    // 北方多闻天王
    { type: 'image', src: '/章节1图片素材/天王3.webp', caption: '北方多闻天王（局部细节）', width: '20vw', align: 'center', colors: [{ hex: '#EAE5D9', name: '铅白', percentage: 40 }, { hex: '#34495E', name: '石青', percentage: 30 }, { hex: '#4A7C59', name: '石绿', percentage: 20 }, { hex: '#E6C687', name: '泥金', percentage: 10 }] },
    { type: 'text', kicker: 'NORTH', title: '北方多闻天王', body: '战袍铠甲鳞片雕刻入微，胸前配有兽面吞口。其裸露的肌肤曾以铅白打底并施以泥金；而在铠甲退晕处，则使用石青与石绿填补，形成强烈的冷暖碰撞。', reference: '[1] 栖霞寺舍利塔天王像法器考 / [4] 古代石刻色彩研究'},
    
    // 东方持国天王
    { type: 'image', src: '/章节1图片素材/天王4.webp', caption: '东方持国天王（局部细节）', width: '24vw', align: 'start', colors: [{ hex: '#CD853F', name: '土黄', percentage: 45 }, { hex: '#D24136', name: '朱砂', percentage: 25 }, { hex: '#191970', name: '青金', percentage: 20 }, { hex: '#EAE5D9', name: '铅白', percentage: 10 }] },
    { type: 'text', kicker: 'EAST', title: '东方持国天王', body: '怀抱琵琶，掌理天乐。石材的粗粝肌理下，南唐匠人完美再现了重型铠甲的厚重感与金属质感，是五代将领甲胄极珍贵的立体史料。', reference: '[1] 栖霞寺舍利塔天王像法器考'}
  ],

  // ---- 5. 普贤菩萨 ----
  'bodhisattva': [
    { type: 'hero', title: '六牙白象\n与佚失的大智', subtitle: 'BODHISATTVAS' },
    { type: 'image', src: '/章节1图片素材/普贤菩萨.webp', caption: '普贤菩萨跏趺坐于六牙白象背负的莲台上', width: '38vw', align: 'center', colors: [{ hex: '#F5F5DC', name: '蛤粉', percentage: 55 }, { hex: '#E6C687', name: '泥金', percentage: 25 }, { hex: '#C1392B', name: '朱砂', percentage: 15 }, { hex: '#4A8F79', name: '石绿', percentage: 5 }] },
    { type: 'text', kicker: 'COMPASSION', title: '幸存的经典', body: '位于西面的普贤菩萨相对完好。菩萨神态宁静，左手持经函；身旁站立着面颊丰腴的昆仑奴，正当胸紧握缰绳牵引白象，展现了南唐极具特征的造像样式。', reference: '[4] 栖霞山造像残存细节考'},
    { type: 'image', src: '/章节1图片素材/文殊菩萨-已缺失.webp', caption: '东面文殊菩萨现已佚失，仅留残痕', width: '24vw', align: 'start' },
    { type: 'text', kicker: 'WISDOM', title: '战火中的大智之殇', body: '令人扼腕的是，原本坐镇东面的文殊菩萨在南宋时期遭遇金兵焚掠，惨遭毁坏殆尽。学界推测其原貌为极具西域风情的"新样文殊"——由头戴冠冕的于阗国王牵引雄狮。这铺遗失的金碧绝唱，正是数字复原工作的核心初衷。', reference: '[1-3] 南宋金兵毁佛与新样文殊图像考'}
  ],

  // ---- 6. 须弥座 ----
  'base': [
    { type: 'hero', title: '海浪与瑞兽\n的交响', subtitle: 'SUMERU THRONE AND BASE' },
    { type: 'image', src: '/章节1图片素材/塔基与须弥座.webp', caption: '束腰处大面积浮雕了翻滚的海水与瑞兽', width: '42vw', align: 'center', colors: [{ hex: '#5F9EA0', name: '花青', percentage: 45 }, { hex: '#FFF8DC', name: '云母', percentage: 30 }, { hex: '#34495E', name: '深青', percentage: 15 }, { hex: '#C1392B', name: '朱红', percentage: 10 }] },
    { type: 'text', kicker: 'WATER & BEAST', title: '翻涌的基石', body: '南唐工匠在束腰处大面积浮雕了翻滚的海水与神异的瑞兽。水纹波涛汹涌，与上方端庄肃穆的佛国世界形成了强烈的动静对比。', reference: '等待 NotebookLM 数据注入...'},
    { type: 'image', src: '/章节1图片素材/龙.webp', caption: '腾出水面的瑞龙浮雕', width: '22vw', align: 'end' },
    { type: 'image', src: '/章节1图片素材/题记.webp', caption: '刻于塔身的经文与偈颂', width: '9vw', align: 'start' },
    { type: 'text', kicker: 'INSCRIPTION', title: '断代悬案与历史拼图', body: '令人惊讶的是，塔身并未留下任何纪年铭文，其刻有的经文因保留了"六朝别字"习惯，曾误导早年学者将其断代为隋。现代学者是通过考证南唐官员高越与将领林仁肇的履历交集，才如解谜般将建塔年代精确定位于公元945至965年间。', reference: '[1, 2] 梁思成考察报告 / [4, 5] 徐永利等关于南唐人物履历交叉推断考'}
  ],

  // ---- 7. 八相成道图 ----
  'story': [
    { type: 'hero', title: '佛传史诗：\n八相成道', subtitle: 'EIGHT PHASES OF THE BUDDHA' },
    { type: 'gallery', kicker: 'NARRATIVE', title: '华严宗的大乘孤例', intro: '匠人采用了先进的"连环画式"视觉引导，用首尾呼应的朝向推动叙事。更震撼的是，这是中国现存佛塔中，唯一一处受《华严经》影响的"大乘八相"孤例建筑（将降魔相打破常规置于成道相之后），具有不可估量的历史文献价值。', align: 'center',
      colors: [
        { hex: '#D2B48C', name: '赭石', percentage: 40 },
        { hex: '#E6C687', name: '泥金', percentage: 30 },
        { hex: '#800000', name: '绛红', percentage: 20 },
        { hex: '#34495E', name: '石青', percentage: 10 }
      ],
      items: [
        { image: '/章节1图片素材/八相成道图-1.webp', label: '降兜率天', desc: '乘六牙白象降下兜率天宫' },
        { image: '/章节1图片素材/八相成道图-2.webp', label: '树下诞生', desc: '右胁诞生与九龙灌浴' },
        { image: '/章节1图片素材/八相成道图-3.webp', label: '出游四门', desc: '见老病死萌生出家之念' },
        { image: '/章节1图片素材/八相成道图-4.webp', label: '逾城出家', desc: '深夜离宫割发贸衣' },
        { image: '/章节1图片素材/八相成道图-5.webp', label: '禅河澡浴', desc: '洗去污垢受牧女献糜' },
        { image: '/章节1图片素材/八相成道图-6.webp', label: '成道', desc: '菩提树下悟道受四王献钵' },
        { image: '/章节1图片素材/八相成道图-7.webp', label: '降魔', desc: '大乘八相特有：降伏魔军初转法轮' },
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
   DeepReadArticle: 博物馆级数字长卷
   设计理念：不是横向滑动的网页，而是一轴缓缓展开的数字长卷
============================================================ */
export function DeepReadArticle({ nodeId, onBack }: DeepReadArticleProps) {
  const [visible, setVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  // 获取当前节点对应的内容
  const cards = nodeContentMap[nodeId] || nodeContentMap['intro']

  // 入场动画
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  // 卡片 staggered 入场动画
  useEffect(() => {
    if (!visible) return

    // 等待 DOM 更新后执行动画
    const timer = setTimeout(() => {
      const cardElements = trackRef.current?.querySelectorAll('.gallery-card-wrapper')
      if (!cardElements || cardElements.length === 0) return

      // 重置卡片状态
      gsap.set(cardElements, { 
        opacity: 0, 
        y: 60,
        scale: 0.95
      })

      // 执行入场动画
      gsap.to(cardElements, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.3
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [visible])

  // 滚动监听 - 更新进度条
  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const handleScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      const progress = maxScroll > 0 ? (el.scrollLeft / maxScroll) * 100 : 0
      setScrollProgress(progress)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // 滚轮横向滚动
  useEffect(() => {
    const el = galleryRef.current
    if (!el || !trackRef.current) return

    const handler = (e: globalThis.WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        trackRef.current!.scrollLeft += e.deltaY * 0.8
      }
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // 键盘导航
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!trackRef.current) return
      const amount = window.innerWidth * 0.4
      
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
          <span className="close-text">关闭</span>
          <span className="gallery-close-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </span>
        </button>
      </header>

      {/* 底部技术网格栏 */}
      <footer className="gallery-bottombar">
        <span className="tech-text">NODE: {nodeId.toUpperCase()}</span>
        <div className="scroll-indicator">
          <span className="tech-text scroll-label">SCROLL</span>
          <div className="indicator-line">
            <div 
              className="indicator-progress" 
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
        <span className="tech-text live-status">
          <span className="status-dot"></span>
          ACTIVE
        </span>
      </footer>

      {/* 展线轨道 */}
      <div className="gallery-scroll-track" ref={trackRef}>
        {cards.map((card, i) => (
          <div 
            className="gallery-card-wrapper" 
            key={i} 
            style={getWrapperStyle(card.align)}
          >
            {renderCard(card)}
          </div>
        ))}
        {/* 结尾卡片 */}
        <div className="gallery-card-wrapper end-card">
          <div className="card-closing-subtle">
            <span className="closing-kicker">END OF SECTION</span>
            <h3 className="closing-title">探索更多</h3>
            <button className="interactive btn-editorial-subtle" onClick={onBack}>
              返回展览
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   渲染各类型卡片
============================================================ */
function getWrapperStyle(_align?: 'start' | 'center' | 'end') {
  // 统一使用 center 对齐，让视觉更稳定
  return { alignSelf: 'center' }
}

function getInnerStyle(customWidth?: string) {
  return { width: customWidth }
}

function renderCard(card: GalleryCard) {
  switch (card.type) {
    case 'hero':
      return (
        <div className="card-hero" style={getInnerStyle(card.width || '28vw')}>
          <span className="card-hero-subtitle">{card.subtitle}</span>
          <h1 className="card-hero-title">{card.title}</h1>
          {card.body && <p className="card-hero-body">{card.body}</p>}
        </div>
      )

    case 'text':
      return (
        <div className="card-text" style={getInnerStyle(card.width || '26vw')}>
          <span className="card-kicker">{card.kicker}</span>
          <h2 className="card-title">{card.title}</h2>
          <div className="card-divider" />
          <p className="card-body">{card.body}</p>
          {card.caption && <p className="card-caption">{card.caption}</p>}
          {card.note && <blockquote className="card-note">{card.note}</blockquote>}
          {card.reference && (
            <div className="card-reference">
              <span className="ref-icon">※</span>
              <span className="ref-content">{card.reference}</span>
            </div>
          )}
        </div>
      )

    case 'image':
      return (
        <div className="card-image" style={getInnerStyle(card.width || '36vw')}>
          <div className="card-image-wrapper">
            <div className="card-image-frame">
              <img src={card.src} alt={card.caption} loading="lazy" decoding="async" />
            </div>
            {card.colors && (
              <div className="image-color-palette">
                {card.colors.slice(0, 3).map((c, idx) => (
                  <div key={idx} className="mini-color-swatch" title={`${c.name} ${c.percentage}%`}>
                    <span className="mini-color-dot" style={{ backgroundColor: c.hex }}></span>
                    <span className="mini-color-text">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
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
