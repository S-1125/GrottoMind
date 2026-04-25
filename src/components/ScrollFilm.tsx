import { useEffect, useRef, useState, type CSSProperties } from 'react'

type FilmScene = {
  eyebrow: string
  title: string
  body: string
  align: 'left' | 'center' | 'right'
}

const scenes: FilmScene[] = [
  {
    eyebrow: 'SCENE 01 / THE APPROACH',
    title: 'A WORLD HELD IN STONE',
    body: '以缓慢推进的影像替代重型 3D 模型，让观众像穿过山门一样进入一段被岩壁包裹的叙事。',
    align: 'center',
  },
  {
    eyebrow: 'SCENE 02 / THE THRESHOLD',
    title: 'ENTER THE DARKENED GROTTO',
    body: '场景不是切换页面，而是被滚动一点点照亮。AI 视频或 360 图可以在这里成为“伪三维世界”的主体。',
    align: 'left',
  },
  {
    eyebrow: 'SCENE 03 / THE REVEAL',
    title: 'COLOR RETURNS AS LIGHT',
    body: '显影层、尘粒、洞窟轮廓和局部光斑叠在影像之上，形成一种高级展览网站的慢速沉浸感。',
    align: 'right',
  },
  {
    eyebrow: 'SCENE 04 / THE ARCHIVE',
    title: 'A SMALL WORLD, CAREFULLY MADE',
    body: '后续只要替换视频、截图或 360 场景图，就能继续扩展为石窟叙事、复彩实验室和问窟者导览。',
    align: 'center',
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ScrollFilm() {
  const rigRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeScene, setActiveScene] = useState(0)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  const scrollToScene = (index: number) => {
    const rig = rigRef.current
    const scrollHost = rig?.closest('.app-root') as HTMLElement | null
    if (!rig || !scrollHost) return

    const viewportHeight = window.innerHeight || scrollHost.clientHeight || 1
    const scrollableHeight = Math.max(rig.offsetHeight - viewportHeight, 1)
    const sceneProgress = clamp(index / scenes.length + 0.01, 0, 0.98)

    scrollHost.scrollTo({
      top: rig.offsetTop + scrollableHeight * sceneProgress,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const rig = rigRef.current
    if (!rig) return

    const scrollHost = rig.closest('.app-root') as HTMLElement | null
    let frameId = 0

    const update = () => {
      const rect = rig.getBoundingClientRect()
      const viewportHeight = window.innerHeight || scrollHost?.clientHeight || 1
      const scrollableHeight = Math.max(rect.height - viewportHeight, 1)
      const nextProgress = clamp(-rect.top / scrollableHeight, 0, 1)
      const nextScene = clamp(Math.floor(nextProgress * scenes.length), 0, scenes.length - 1)

      rig.style.setProperty('--film-progress', nextProgress.toFixed(4))
      rig.style.setProperty('--film-depth', (nextProgress * 100).toFixed(2))

      setProgress((current) => (Math.abs(current - nextProgress) > 0.002 ? nextProgress : current))
      setActiveScene((current) => (current !== nextScene ? nextScene : current))

      const video = videoRef.current
      if (!videoFailed && video && Number.isFinite(video.duration) && video.duration > 0) {
        const targetTime = nextProgress * Math.max(video.duration - 0.04, 0)
        if (Math.abs(video.currentTime - targetTime) > 0.04) {
          video.currentTime = targetTime
        }
      }
    }

    const requestUpdate = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(update)
    }

    requestUpdate()
    scrollHost?.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      window.cancelAnimationFrame(frameId)
      scrollHost?.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [videoFailed])

  const style = {
    '--film-progress': progress,
    '--film-scene-count': scenes.length,
  } as CSSProperties

  return (
    <section ref={rigRef} className="scroll-film" style={style} aria-label="沉浸式滚动场景">
      <div className="film-sticky">
        <div className="film-world" aria-hidden="true">
          <video
            ref={videoRef}
            className={`film-video ${videoReady && !videoFailed ? 'is-visible' : ''}`}
            src="/assets/grotto-flight.mp4"
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(event) => {
              event.currentTarget.pause()
              setVideoReady(true)
            }}
            onError={() => setVideoFailed(true)}
          />
          <div className="film-plate" />
          <div className="film-depth-layer film-depth-back" />
          <div className="film-depth-layer film-depth-mid" />
          <div className="film-grotto-outline">
            <span className="outline-arch outline-arch-large" />
            <span className="outline-arch outline-arch-small outline-one" />
            <span className="outline-arch outline-arch-small outline-two" />
          </div>
          <div className="film-light" />
          <div className="film-dust film-dust-a" />
          <div className="film-dust film-dust-b" />
          <div className="film-vignette" />
        </div>

        <div className="film-copy-stack">
          {scenes.map((scene, index) => (
            <article
              className={`film-copy film-copy-${scene.align} ${activeScene === index ? 'is-active' : ''}`}
              key={scene.title}
              aria-hidden={activeScene !== index}
            >
              <p className="film-eyebrow">{scene.eyebrow}</p>
              <h1>{scene.title}</h1>
              <p className="film-body">{scene.body}</p>
            </article>
          ))}
        </div>

        <nav className="film-side-nav" aria-label="滚动场景章节">
          {scenes.map((scene, index) => (
            <button
              className={`film-side-dot ${activeScene === index ? 'is-active' : ''}`}
              key={scene.eyebrow}
              type="button"
              aria-label={`跳转到 ${scene.eyebrow}`}
              aria-current={activeScene === index ? 'step' : undefined}
              onClick={() => scrollToScene(index)}
            />
          ))}
        </nav>

        <div className="film-chapter-index" aria-label="当前进度">
          <span>{String(activeScene + 1).padStart(2, '0')}</span>
          <i />
          <span>{String(scenes.length).padStart(2, '0')}</span>
        </div>

        <nav className="film-lower-nav" aria-label="沉浸场景控制">
          <button className="round-link">
            <span>EXPLORE</span>
          </button>
          <div className="film-progress-track" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
          <p>SCROLL CONTROLLED FILM / VIDEO READY SLOT</p>
        </nav>
      </div>
    </section>
  )
}
