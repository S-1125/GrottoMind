import { useEffect, useState } from 'react'

type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function getFullscreenElement() {
  const webkitDocument = document as WebkitFullscreenDocument
  return document.fullscreenElement ?? webkitDocument.webkitFullscreenElement ?? null
}

async function requestPageFullscreen() {
  const root = document.documentElement as WebkitFullscreenElement

  if (root.requestFullscreen) {
    await root.requestFullscreen()
    return
  }

  await root.webkitRequestFullscreen?.()
}

async function exitPageFullscreen() {
  const webkitDocument = document as WebkitFullscreenDocument

  if (document.exitFullscreen) {
    await document.exitFullscreen()
    return
  }

  await webkitDocument.webkitExitFullscreen?.()
}

/* ============================================================
   FullscreenButton: 右下角全屏控制按钮
   兼容标准 Fullscreen API 与 Safari 的 webkit 前缀。
============================================================ */
export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(getFullscreenElement()))
    }

    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)
    syncFullscreenState()

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (getFullscreenElement()) {
        await exitPageFullscreen()
      } else {
        await requestPageFullscreen()
      }
    } catch (error) {
      console.warn('全屏切换失败：', error)
    }
  }

  return (
    <button
      className={`intro-ctrl-btn ${isFullscreen ? 'is-active' : ''}`}
      aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
      aria-pressed={isFullscreen}
      onClick={toggleFullscreen}
    >
      <svg className="ctrl-btn-outline" viewBox="0 0 50 50" aria-hidden="true">
        <rect width="48.25" height="48.25" strokeWidth="1.75" x="0.5" y="0.5" rx="16" />
      </svg>
      <span className="ctrl-btn-bg" />
      <svg className="ctrl-icon fullscreen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isFullscreen ? (
          <>
            <path d="M8 3v5H3" />
            <path d="M16 3v5h5" />
            <path d="M8 21v-5H3" />
            <path d="M16 21v-5h5" />
          </>
        ) : (
          <>
            <path d="M8 3H3v5" />
            <path d="M16 3h5v5" />
            <path d="M8 21H3v-5" />
            <path d="M16 21h5v-5" />
          </>
        )}
      </svg>
    </button>
  )
}
