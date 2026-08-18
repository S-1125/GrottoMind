/* ====================================================================
   GrottoMind 专业博物馆级声学引擎 (Museum Sound Engine Pro v5.0)
   设计准则: 宁静致远 · 东方金石玉磬雅音 · 绝无嘈杂背景音乐
   - 默认保持展厅纯净静谧环境，拒绝任何轰鸣/现代电子迷幻音
   - 专注提供极致清脆、典雅的玉磬 (Chime)、古钟 (Gong) 与矿物和弦交互反馈
==================================================================== */

class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null

  // 状态（默认静音，由用户自主开启）
  private isMuted: boolean = true
  private sfxEnabled: boolean = true

  // 防爆音与节流
  private lastChimeTime: number = 0
  private lastTickTime: number = 0

  private storageKey = 'grottomind_sound_v4'

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        this.isMuted = parsed.isMuted ?? true
        this.sfxEnabled = parsed.sfxEnabled ?? true
      }
    } catch { /* 忽略 */ }
  }

  private saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        isMuted: this.isMuted,
        sfxEnabled: this.sfxEnabled
      }))
    } catch { /* 忽略 */ }
  }

  /**
   * 初始化 AudioContext (由用户交互激活)
   */
  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()

      // 1. 主总线
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)

      // 2. 纯净金石交互总线
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.9 : 0, this.ctx.currentTime)
      this.sfxGain.connect(this.masterGain)
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  // ==================================================================
  // 全局控制与开关
  // ==================================================================

  public setMuted(muted: boolean) {
    this.isMuted = muted
    this.saveSettings()

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.85, now + 0.15)
    }

    if (!muted) {
      this.playChime(660, 0.2)
    }
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  public setAmbientEnabled(_enabled: boolean) {
    // 展厅保持清净无吵闹BGM
  }

  public getAmbientEnabled(): boolean {
    return false
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled
    this.saveSettings()
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime
      this.sfxGain.gain.cancelScheduledValues(now)
      this.sfxGain.gain.setValueAtTime(enabled ? 0.9 : 0, now)
    }
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled
  }

  public startAmbient() {
    // 彻底停用嘈杂 BGM，展厅保持高级静谧
    this.initContext()
  }

  public stopAmbient() {
    // 空函数
  }

  // ==================================================================
  // 1. 金石击磬音 (Stone Chime - 纯净玉石相击)
  // ==================================================================

  public playChime(baseFreq = 880, duration = 0.4, volume = 0.18) {
    if (this.isMuted || !this.sfxEnabled) return
    const nowMs = performance.now()
    if (nowMs - this.lastChimeTime < 35) return
    this.lastChimeTime = nowMs

    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(baseFreq, now)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + duration)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(volume, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 2. 宏阔古钟禅鸣 (Gong of Era - 章节切换)
  // ==================================================================

  public playGong(freq = 160) {
    if (this.isMuted || !this.sfxEnabled) return
    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const duration = 2.4

      const osc1 = this.ctx.createOscillator()
      const osc2 = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(freq, now)

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(freq * 1.498, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(this.sfxGain)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + duration)
      osc2.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 3. 3D 浮雕热点定焦微音 (Stela Focus Ping)
  // ==================================================================

  public playHotspotLock() {
    if (this.isMuted || !this.sfxEnabled) return
    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const duration = 0.16
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1046.5, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 4. 古籍文献拓片翻卷微音 (Paper / Stela Rustle)
  // ==================================================================

  public playPaperRustle() {
    if (this.isMuted || !this.sfxEnabled) return
    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.linearRampToValueAtTime(160, now + 0.14)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(500, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.035, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.14)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 5. 矿物动态色谱和弦 (Mineral Spectral Chord - 清脆怡人)
  // ==================================================================

  public playColorPick(hex = '#C03020') {
    if (this.isMuted || !this.sfxEnabled) return

    const num = parseInt(hex.replace('#', ''), 16) || 0
    const baseRoot = 523.25 + (num % 220) // C5 ~ G5
    const ratios = [1, 1.25, 1.5, 2]

    ratios.forEach((r, idx) => {
      setTimeout(() => {
        this.playChime(baseRoot * r, 0.35, 0.09)
      }, idx * 35)
    })
  }

  // ==================================================================
  // 6. 辅助轻微音
  // ==================================================================

  public playHover() {
    if (this.isMuted || !this.sfxEnabled) return
    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, now)
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.015, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.05)
    } catch { /* 忽略 */ }
  }

  public playChiselTick() {
    if (this.isMuted || !this.sfxEnabled) return
    const nowMs = performance.now()
    if (nowMs - this.lastTickTime < 25) return
    this.lastTickTime = nowMs

    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1800 + Math.random() * 300, now)

      gain.gain.setValueAtTime(0.012, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.01)
    } catch { /* 忽略 */ }
  }
}

export const soundEngine = new SoundEngine()
