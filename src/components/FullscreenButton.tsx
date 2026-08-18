import { useState, useEffect } from 'react'

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isFullscreenAvailable = () => {
    return Boolean(
      document.fullscreenEnabled ??
      (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ??
      false
    )
  }

  const getFullscreenElement = () => {
    const webkitDocument = document as Document & { webkitFullscreenElement?: Element }
    return document.fullscreenElement ?? webkitDocument.webkitFullscreenElement ?? null
  }

  const requestPageFullscreen = async () => {
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>
    }

    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen()
      return
    }

    if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen()
    }
  }

  const exitPageFullscreen = async () => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>
    }

    if (doc.exitFullscreen) {
      await doc.exitFullscreen()
      return
    }

    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen()
    }
  }

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(getFullscreenElement()))
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
    }
  }, [])

  if (!isFullscreenAvailable()) return null

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
      className={`intro-ctrl-btn fullscreen-btn ${isFullscreen ? 'is-active' : ''}`}
      aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
      aria-pressed={isFullscreen}
      onClick={toggleFullscreen}
      title={isFullscreen ? '退出全屏 (ESC)' : '进入全屏'}
    >
      <svg className="ctrl-icon fullscreen-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isFullscreen ? (
          <>
            <path d="M8 3v5H3" />
            <path d="M16 3v5h5" />
            <path d="M8 21v-5H3" />
            <path d="M16 21v-5h5" />
          </>
        ) : (
          <>
            <path d="M3 8V3h5" />
            <path d="M21 8V3h-5" />
            <path d="M3 16v5h5" />
            <path d="M21 16v5h-5" />
          </>
        )}
      </svg>
    </button>
  )
}
