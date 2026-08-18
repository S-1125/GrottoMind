/* ====================================================================
   GrottoMind 专业博物馆级程序化声学引擎 (Museum Sound Engine Pro v3.0)
   - 纯 Web Audio API 合成，0 外部文件依赖，0 延迟，0 流量开销
   - 东方金石禅意声学：216Hz/432Hz 栖霞空山环境音 + 徕卡级阻尼金石微音
==================================================================== */

class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private sfxGain: GainNode | null = null

  // 状态
  private isMuted: boolean = false
  private ambientEnabled: boolean = true
  private sfxEnabled: boolean = true
  private isAmbientPlaying: boolean = false

  // 氛围合成节点
  private ambientOscs: OscillatorNode[] = []
  private ambientNoise: AudioNode | null = null

  // 防爆音与节流状态
  private lastFrictionTime: number = 0
  private lastChimeTime: number = 0
  private lastTickTime: number = 0

  private storageKey = 'grottomind_sound_v2'

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
   * 初始化 AudioContext (由用户手势激活)
   */
  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()

      // 1. 主增益
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.9, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)

      // 2. 环境音总线 (清晰充盈的适中音量: 0.28)
      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.setValueAtTime(this.ambientEnabled ? 0.28 : 0, this.ctx.currentTime)
      this.ambientGain.connect(this.masterGain)

      // 3. 交互音效总线
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.85 : 0, this.ctx.currentTime)
      this.sfxGain.connect(this.masterGain)
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
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
      this.ambientGain.gain.linearRampToValueAtTime(enabled ? 0.28 : 0, now + 0.3)
    }
    if (enabled && !this.isMuted) {
      this.startAmbient()
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
  // 1. 石窟空灵氛围音 (Cave Ambient Drone - 提升可听度与禅意泛音)
  // ==================================================================

  public startAmbient() {
    if (this.isMuted || !this.ambientEnabled || this.isAmbientPlaying) return
    this.initContext()
    if (!this.ctx || !this.ambientGain) return

    try {
      this.isAmbientPlaying = true
      const now = this.ctx.currentTime

      // 东方五音禅意泛音结构 (216Hz 宫调 + 432Hz 疗愈泛音 + 648Hz 空灵高音)
      // 在普通笔记本与耳机中都能清晰听到温润空灵的鸣响
      const chord = [
        { freq: 216, gain: 0.32, drift: 0.15 },
        { freq: 432, gain: 0.22, drift: 0.25 },
        { freq: 648, gain: 0.12, drift: 0.35 }
      ]

      this.ambientOscs = chord.map((item) => {
        const osc = this.ctx!.createOscillator()
        const g = this.ctx!.createGain()
        osc.type = 'sine'
        // 极微小的干涉波频偏，营造远山古窟的天然呼吸感
        osc.frequency.setValueAtTime(item.freq + item.drift, now)

        g.gain.setValueAtTime(item.gain, now)
        osc.connect(g)
        g.connect(this.ambientGain!)
        osc.start()
        return osc
      })

      // 栖霞幽谷微风 (宽频柔和空气感，380Hz 低通滤波)
      const bufferSize = this.ctx.sampleRate * 2
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06
        b6 = white * 0.115926
      }

      const whiteNoise = this.ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(380, now)

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(0.45, now)

      whiteNoise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.ambientGain)
      whiteNoise.start()
      this.ambientNoise = whiteNoise
    } catch {
      this.isAmbientPlaying = false
    }
  }

  public stopAmbient() {
    if (!this.isAmbientPlaying || !this.ctx) return
    try {
      this.ambientOscs.forEach(osc => {
        try { osc.stop(); osc.disconnect() } catch {}
      })
      this.ambientOscs = []
      if (this.ambientNoise) {
        try { (this.ambientNoise as any).stop(); this.ambientNoise.disconnect() } catch {}
        this.ambientNoise = null
      }
      this.isAmbientPlaying = false
    } catch {
      this.isAmbientPlaying = false
    }
  }

  // ==================================================================
  // 2. 金石击磬音 (Stone Chime)
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
      osc2.frequency.setValueAtTime(freq * 1.498, now) // 五度纯泛音

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.25, now + 0.035)
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
  // 4. 3D 舍利塔旋转阻尼微风音 (Velvet Damped Air Flow - 告别滑稽感)
  // 模拟高端镜头转动或重磅石雕缓缓移位的温和气流微阻尼
  // ==================================================================

  public playStoneFriction(intensity = 0.04) {
    if (this.isMuted || !this.sfxEnabled) return
    const nowMs = performance.now()
    if (nowMs - this.lastFrictionTime < 80) return // 80ms 节流
    this.lastFrictionTime = nowMs

    this.initContext()
    if (!this.ctx || !this.sfxGain) return

    try {
      const now = this.ctx.currentTime
      const duration = 0.12

      // 使用极细颗粒白噪 + 柔和带通滤波，产生丝绒般的镜头阻尼滑移声
      const bufferSize = Math.floor(this.ctx.sampleRate * duration)
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.08
      }

      const noise = this.ctx.createBufferSource()
      noise.buffer = noiseBuffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(550, now) // 温和的中频气流
      filter.Q.setValueAtTime(1.2, now)

      const gain = this.ctx.createGain()
      const vol = Math.min(intensity * 0.12, 0.035)
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(vol, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGain)

      noise.start(now)
      noise.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  // ==================================================================
  // 5. 3D 浮雕热点定焦微音 (Stela Focus Ping - 纯净单音定焦)
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

      // 纯净高贵单音 (1046Hz / C6 玉磬轻触)
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
  // 6. 古籍文献拓片翻卷微音 (Paper / Stela Rustle)
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
  // 7. 矿物动态色谱和弦 (Mineral Spectral Chord)
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
  // 8. 辅助轻微音
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
