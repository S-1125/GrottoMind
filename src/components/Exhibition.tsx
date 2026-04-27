import { TimelineHall } from './TimelineHall'

/* ============================================================
   Exhibition: 进入后的展览主容器
   当前阶段只承载第一章，后续展厅从这里继续生长。
============================================================ */
export function Exhibition() {
  return (
    <section className="exhibition-stage" aria-label="问窟沉浸式展览">
      <TimelineHall />
    </section>
  )
}
