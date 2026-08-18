import { useEffect, useState, useMemo } from 'react'
import './KnowledgeGraphModal.css'

interface NodeItem {
  id: string
  name: string
  category: string
  period: string
  val: number
  desc: string
}

interface LinkItem {
  source: string
  target: string
  relation: string
}

interface CategoryInfo {
  label: string
  color: string
}

interface GraphData {
  categories: Record<string, CategoryInfo>
  nodes: NodeItem[]
  links: LinkItem[]
}

interface KnowledgeGraphModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectNode?: (nodeName: string) => void
}

const API_BASE = import.meta.env.VITE_AGENT_API || 'https://grottomind.onrender.com'

export function KnowledgeGraphModal({ isOpen, onClose, onSelectNode }: KnowledgeGraphModalProps) {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<NodeItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch(`${API_BASE}/api/knowledge/graph`)
      .then(res => res.json())
      .then((resData: GraphData) => {
        setData(resData)
        if (resData.nodes?.length) {
          setSelectedNode(resData.nodes[0])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [isOpen])

  // 节点过滤
  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return []
    return data.nodes.filter(n => {
      const matchCat = activeCategory === 'all' || n.category === activeCategory
      const matchSearch = !searchTerm || n.name.toLowerCase().includes(searchTerm.toLowerCase()) || n.desc.includes(searchTerm)
      return matchCat && matchSearch
    })
  }, [data, activeCategory, searchTerm])

  // 计算与当前选中节点相关联的连线与目标
  const relatedLinks = useMemo(() => {
    if (!data?.links || !selectedNode) return []
    return data.links.filter(
      l => l.source === selectedNode.id || l.target === selectedNode.id
    )
  }, [data, selectedNode])

  if (!isOpen) return null

  return (
    <div className="kg-overlay" onClick={onClose}>
      <div className="kg-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="栖霞山石窟知识图谱">
        {/* 顶部标题栏 */}
        <div className="kg-header">
          <div className="kg-header__title-group">
            <span className="kg-header__icon">❖</span>
            <div>
              <h2 className="kg-header__title">栖霞山石窟学术知识图谱</h2>
              <p className="kg-header__subtitle">KNOWLEDGE GRAPH OF QIXIA GROTTOES & ARTIFACTS</p>
            </div>
          </div>
          <button className="kg-close-btn" onClick={onClose} aria-label="关闭图谱">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 检索与分类过滤器 */}
        <div className="kg-toolbar">
          <div className="kg-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索实体（如：朱砂、飞天、钱弘俶）..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="kg-search-input"
            />
          </div>

          <div className="kg-category-pills">
            <button
              className={`kg-pill ${activeCategory === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              全部实体 ({data?.nodes?.length || 0})
            </button>
            {data?.categories && Object.entries(data.categories).map(([key, cat]) => (
              <button
                key={key}
                className={`kg-pill ${activeCategory === key ? 'is-active' : ''}`}
                style={{ '--pill-color': cat.color } as any}
                onClick={() => setActiveCategory(key)}
              >
                <span className="kg-pill-dot" style={{ backgroundColor: cat.color }} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 主体交互区：左侧网格拓扑卡片 + 右侧实体考据简牍 */}
        <div className="kg-body">
          {/* 左侧实体拓扑节点网格 */}
          <div className="kg-network-view">
            {loading ? (
              <div className="kg-loading">正在提取知识图谱实体网络...</div>
            ) : filteredNodes.length === 0 ? (
              <div className="kg-empty">未匹配到相关实体节点</div>
            ) : (
              <div className="kg-node-grid">
                {filteredNodes.map(node => {
                  const catColor = data?.categories[node.category]?.color || '#f6cea0'
                  const isSelected = selectedNode?.id === node.id
                  return (
                    <div
                      key={node.id}
                      className={`kg-node-card ${isSelected ? 'is-selected' : ''}`}
                      style={{ '--node-accent': catColor } as any}
                      onClick={() => setSelectedNode(node)}
                    >
                      <div className="kg-node-card__header">
                        <span className="kg-node-badge" style={{ borderColor: catColor, color: catColor }}>
                          {data?.categories[node.category]?.label || node.category}
                        </span>
                        <span className="kg-node-period">{node.period}</span>
                      </div>
                      <h4 className="kg-node-card__name">{node.name}</h4>
                      <p className="kg-node-card__desc">{node.desc}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 右侧实体考据与证据链 */}
          <div className="kg-inspector">
            {selectedNode ? (
              <div className="kg-inspector__inner">
                <div className="kg-inspector__badge" style={{ color: data?.categories[selectedNode.category]?.color }}>
                  ❖ {data?.categories[selectedNode.category]?.label}
                </div>
                <h3 className="kg-inspector__title">{selectedNode.name}</h3>
                <div className="kg-inspector__period">历史断代：{selectedNode.period}</div>
                
                <div className="kg-inspector__section">
                  <h4>实体学术考据</h4>
                  <p className="kg-inspector__text">{selectedNode.desc}</p>
                </div>

                {/* 关联拓扑关系 */}
                <div className="kg-inspector__section">
                  <h4>知识图谱关系拓扑 ({relatedLinks.length})</h4>
                  <div className="kg-inspector__links">
                    {relatedLinks.length === 0 ? (
                      <p className="kg-inspector__empty-links">暂无直接关联</p>
                    ) : (
                      relatedLinks.map((link, idx) => {
                        const isSource = link.source === selectedNode.id
                        const otherId = isSource ? link.target : link.source
                        const otherNode = data?.nodes.find(n => n.id === otherId)
                        return (
                          <div
                            key={idx}
                            className="kg-link-item"
                            onClick={() => otherNode && setSelectedNode(otherNode)}
                          >
                            <span className="kg-link-relation">{link.relation}</span>
                            <span className="kg-link-target">➜ {otherNode?.name || otherId}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* 智能导览联动 */}
                {onSelectNode && (
                  <button
                    className="kg-inspector__action-btn"
                    onClick={() => {
                      onSelectNode(selectedNode.name)
                      onClose()
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    向问窟者探讨此实体
                  </button>
                )}
              </div>
            ) : (
              <div className="kg-inspector__placeholder">点击左侧实体节点查看考据证据链</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
