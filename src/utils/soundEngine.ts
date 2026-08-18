/* ====================================================================
   GrottoMind 声音引擎 (Grotto Ambient & Chime Synthesizer)
   基于 Web Audio API 的程序化石窟金石音频合成器
   - 0 外部音频依赖 · 0 加载延迟 · 纯净金石空灵音色
   - 包含：石窟冥想空灵背景音 (Ambient Drone)、金石击磬音 (Chime)、
          刀刻微音 (Chisel Tick)、古钟禅鸣 (Gong)、矿物色谱音 (Color Pick)
==================================================================== */

class SoundEngine {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false
  private masterGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private ambientOscs: OscillatorNode[] = []
  private ambientNoise: AudioNode | null = null
  private isAmbientPlaying: boolean = false
  private storageKey = 'grottomind_sound_enabled'

  constructor() {
    // 从本地存储读取静音设置，默认开启
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved !== null) {
        this.isMuted = saved === 'false'
      }
    } catch { /* 忽略 */ }
  }

  /**
   * 初始化 AudioContext (必须由用户交互触发)
   */
  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()

      // 主音量
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  /**
   * 设置全局静音状态
   */
  public setMuted(muted: boolean) {
    this.isMuted = muted
    try {
      localStorage.setItem(this.storageKey, String(!muted))
    } catch { /* 忽略 */ }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.8, now + 0.3)
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

  /**
   * 启动石窟空灵背景氛围音 (Ambient Drone & Cave Reverb)
   */
  public startAmbient() {
    if (this.isMuted || this.isAmbientPlaying) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    try {
      this.isAmbientPlaying = true
      const now = this.ctx.currentTime

      // 氛围总增益（平缓淡入）
      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.setValueAtTime(0, now)
      this.ambientGain.gain.linearRampToValueAtTime(0.065, now + 3.0) // 保持极其柔和空灵的低音量
      this.ambientGain.connect(this.masterGain)

      // 1. 低频石窟共鸣 (54Hz / 108Hz 纯正弦低鸣)
      const freqs = [54, 108, 216]
      this.ambientOscs = freqs.map((f, i) => {
        const osc = this.ctx!.createOscillator()
        const g = this.ctx!.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f + (i === 1 ? 0.3 : 0), now) // 产生极慢的 0.3Hz 呼吸干涉波

        g.gain.setValueAtTime(0.25 / (i + 1), now)
        osc.connect(g)
        g.connect(this.ambientGain!)
        osc.start()
        return osc
      })

      // 2. 模拟微风与石窟幽深气流 (低通滤波粉红噪声)
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
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04
        b6 = white * 0.115926
      }

      const whiteNoise = this.ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(280, now) // 只保留幽深气流

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(0.35, now)

      whiteNoise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.ambientGain)
      whiteNoise.start()
      this.ambientNoise = whiteNoise
    } catch { /* 忽略环境音异常 */ }
  }

  /**
   * 停止背景氛围音
   */
  public stopAmbient() {
    if (!this.isAmbientPlaying || !this.ctx || !this.ambientGain) return
    try {
      const now = this.ctx.currentTime
      this.ambientGain.gain.cancelScheduledValues(now)
      this.ambientGain.gain.linearRampToValueAtTime(0, now + 1.0)

      setTimeout(() => {
        this.ambientOscs.forEach(osc => {
          try { osc.stop(); osc.disconnect() } catch {}
        })
        this.ambientOscs = []
        if (this.ambientNoise) {
          try { (this.ambientNoise as any).stop(); this.ambientNoise.disconnect() } catch {}
          this.ambientNoise = null
        }
        this.isAmbientPlaying = false
      }, 1100)
    } catch {
      this.isAmbientPlaying = false
    }
  }

  /**
   * 金石击磬音 (用于按钮点击、章节切页、Tab 切换)
   * 模拟石磬/玉石被木槌敲击的清脆泛音与指数衰减
   */
  public playChime(baseFreq = 880, duration = 0.5, volume = 0.18) {
    if (this.isMuted) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      // 金石特有泛音混合
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(baseFreq, now)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + duration)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(volume, now + 0.015) // 极速敲击起音
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration) // 纯净金石余响衰减

      osc.connect(gain)
      gain.connect(this.masterGain)

      osc.start(now)
      osc.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  /**
   * 悬停流光音 (轻微高频气流，用于重要卡片 Hover)
   */
  public playHover() {
    if (this.isMuted) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, now)
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.025, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)

      osc.connect(gain)
      gain.connect(this.masterGain)

      osc.start(now)
      osc.stop(now + 0.08)
    } catch { /* 忽略 */ }
  }

  /**
   * 刀刻微音 (用于 AI 打字机吐字或文献行高亮)
   */
  public playChiselTick() {
    if (this.isMuted) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      // 极其短促的木石轻敲音 (12ms)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1800 + Math.random() * 300, now)

      gain.gain.setValueAtTime(0.02, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015)

      osc.connect(gain)
      gain.connect(this.masterGain)

      osc.start(now)
      osc.stop(now + 0.015)
    } catch { /* 忽略 */ }
  }

  /**
   * 宏阔古钟鸣响 (用于章节切换与大模态唤醒)
   */
  public playGong(freq = 174) {
    if (this.isMuted) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const duration = 2.4

      // 主钟声
      const osc1 = this.ctx.createOscillator()
      const osc2 = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(freq, now)

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(freq * 1.498, now) // 五度纯泛音

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.22, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(this.masterGain)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + duration)
      osc2.stop(now + duration)
    } catch { /* 忽略 */ }
  }

  /**
   * 矿物色谱挑选音 (朱砂/石青复制色卡时的和弦回响)
   */
  public playColorPick() {
    if (this.isMuted) return
    const chord = [523.25, 659.25, 783.99, 1046.50] // C大调空灵泛音
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playChime(freq, 0.45, 0.12)
      }, idx * 40)
    })
  }
}

export const soundEngine = new SoundEngine()
