/* ====================================================================
   GrottoMind 专业博物馆级声学引擎 (Museum Sound Engine Pro v4.0)
   - 真实高保真「栖霞山禅境空灵环境音」真实录音音轨 (Zen Atmosphere)
   - 纯净 Web Audio API 金石玉磬交互合成体系
   - 双总线架构 (Ambient Bus + SFX Bus) + 毫秒级淡入淡出平滑渐变
==================================================================== */

class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private sfxGain: GainNode | null = null

  // 真实环境音播放器
  private ambientAudio: HTMLAudioElement | null = null
  private ambientSource: MediaElementAudioSourceNode | null = null

  // 状态
  private isMuted: boolean = false
  private ambientEnabled: boolean = true
  private sfxEnabled: boolean = true
  private isAmbientPlaying: boolean = false

  // 防爆音与节流
  private lastChimeTime: number = 0
  private lastTickTime: number = 0

  private storageKey = 'grottomind_sound_v2'
  private ambientSrc = '/assets/qixia-ambient.mp3'

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        this.isMuted = parsed.isMuted ?? false
        this.ambientEnabled = parsed.ambientEnabled ?? true
        this.sfxEnabled = parsed.sfxEnabled ?? true
      }
    } catch { /* 忽略 */ }
  }

  private saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        isMuted: this.isMuted,
        ambientEnabled: this.ambientEnabled,
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.9, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)

      // 2. 环境音总线 (连接真实空灵音轨，舒适音量 0.38)
      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.setValueAtTime(this.ambientEnabled ? 0.38 : 0, this.ctx.currentTime)
      this.ambientGain.connect(this.masterGain)

      // 3. 交互音效总线
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.85 : 0, this.ctx.currentTime)
      this.sfxGain.connect(this.masterGain)

      // 4. 创建并绑定真实高保真环境音音频流
      this.initAmbientTrack()
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  private initAmbientTrack() {
    if (this.ambientAudio || !this.ctx || !this.ambientGain) return

    try {
      const audio = new Audio(this.ambientSrc)
      audio.loop = true
      audio.crossOrigin = 'anonymous'
      audio.preload = 'auto'

      const source = this.ctx.createMediaElementSource(audio)
      source.connect(this.ambientGain)

      this.ambientAudio = audio
      this.ambientSource = source
    } catch { /* 忽略加载异常 */ }
  }

  // ==================================================================
  // 全局控制与分流开关
  // ==================================================================

  public setMuted(muted: boolean) {
    this.isMuted = muted
    this.saveSettings()

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.9, now + 0.25)
    }

    if (!muted) {
      this.startAmbient()
      this.playChime(660, 0.2)
    } else {
      this.stopAmbient()
    }
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  public setAmbientEnabled(enabled: boolean) {
    this.ambientEnabled = enabled
    this.saveSettings()
    if (this.ctx && this.ambientGain) {
      const now = this.ctx.currentTime
      this.ambientGain.gain.cancelScheduledValues(now)
      this.ambientGain.gain.linearRampToValueAtTime(enabled ? 0.38 : 0, now + 0.3)
    }
    if (enabled && !this.isMuted) {
      this.startAmbient()
    } else {
      this.stopAmbient()
    }
  }

  public getAmbientEnabled(): boolean {
    return this.ambientEnabled
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled
    this.saveSettings()
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime
      this.sfxGain.gain.cancelScheduledValues(now)
      this.sfxGain.gain.setValueAtTime(enabled ? 0.85 : 0, now)
    }
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled
  }

  // ==================================================================
  // 1. 真实高保真石窟空灵背景音 (Zen Meditation Ambient Track)
  // ==================================================================

  public startAmbient() {
    if (this.isMuted || !this.ambientEnabled || this.isAmbientPlaying) return
    this.initContext()

    if (!this.ambientAudio) return

    try {
      this.isAmbientPlaying = true
      const playPromise = this.ambientAudio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.isAmbientPlaying = false
        })
      }
    } catch {
      this.isAmbientPlaying = false
    }
  }

  public stopAmbient() {
    if (!this.ambientAudio) return
    try {
      this.ambientAudio.pause()
      if (this.ambientSource && this.ctx?.state === 'running') {
        // 保持 source 节点连接以备下次恢复
      }
      this.isAmbientPlaying = false
    } catch {
      this.isAmbientPlaying = false
    }
  }

  // ==================================================================
  // 2. 金石击磬音 (Stone Chime - 纯净单音)
  // ==================================================================

  public playChime(baseFreq = 880, duration = 0.45, volume = 0.18) {
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
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.97, now + duration)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(volume, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 3. 宏阔古钟禅鸣 (Gong of Era)
  // ==================================================================

  public playGong(freq = 160) {
    if (this.isMuted || !this.sfxEnabled) return
    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const duration = 2.6

      const osc1 = this.ctx.createOscillator()
      const osc2 = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(freq, now)

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(freq * 1.498, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.22, now + 0.035)
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
  // 4. 3D 浮雕热点定焦微音 (Stela Focus Ping)
  // ==================================================================

  public playHotspotLock() {
    if (this.isMuted || !this.sfxEnabled) return
    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const duration = 0.18
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1046.5, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 5. 古籍文献拓片翻卷微音 (Paper / Stela Rustle)
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
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.linearRampToValueAtTime(180, now + 0.15)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(600, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.04, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.15)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 6. 矿物动态色谱和弦 (Mineral Spectral Chord)
  // ==================================================================

  public playColorPick(hex = '#C03020') {
    if (this.isMuted || !this.sfxEnabled) return

    const num = parseInt(hex.replace('#', ''), 16) || 0
    const baseRoot = 440 + (num % 300)
    const ratios = [1, 1.25, 1.5, 2]

    ratios.forEach((r, idx) => {
      setTimeout(() => {
        this.playChime(baseRoot * r, 0.38, 0.1)
      }, idx * 35)
    })
  }

  // ==================================================================
  // 7. 辅助轻微音
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
      osc.frequency.setValueAtTime(1400, now)
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.06)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.02, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.06)
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
      osc.frequency.setValueAtTime(2000 + Math.random() * 400, now)

      gain.gain.setValueAtTime(0.015, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012)

      osc.connect(gain)
      gain.connect(this.sfxGain)

      osc.start(now)
      osc.stop(now + 0.012)
    } catch { /* 忽略 */ }
  }
}

export const soundEngine = new SoundEngine()
