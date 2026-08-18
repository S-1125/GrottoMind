import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

export type AskRequest = {
  question?: string
  audienceType?: string
  scene?: string
}

export type AskResponse = {
  answer: string
  caveat: string
  suggestedQuestions: string[]
  source: 'fallback' | 'openai'
}

const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini'
const apiKey = process.env.OPENAI_API_KEY
const client = apiKey ? new OpenAI({ apiKey }) : null

const boundary =
  '当涉及历史色彩、造像原貌、文物修复时，必须说明这是数字复彩推演，不应表述为绝对历史事实。'

function fallbackAsk(question: string): AskResponse {
  return {
    answer: `关于"${question}"，可以从三个层次理解：第一，栖霞山石窟造像是六朝佛教艺术、山寺空间与金陵地域记忆交汇的文化遗产；第二，数字复彩用于帮助观众看见色彩可能性、材质层次和风化痕迹；第三，AI 在这里承担导览、解释和生成辅助，而不是替代文物研究。`,
    caveat: boundary,
    suggestedQuestions: ['数字复彩和修复有什么区别？', '为什么要保留风化痕迹？', '共创卡片怎样避免误导？'],
    source: 'fallback',
  }
}

async function generateText(input: string) {
  if (!client) return null
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'user', content: input }
    ],
    temperature: 0.3,
  })
  return response.choices[0]?.message?.content || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    res.status(405).json({ error: '仅支持 POST 请求' })
    return
  }

  const body = req.body as AskRequest
  const question = String(body.question || '').trim()

  if (!question) {
    res.status(400).send('问题不能为空')
    return
  }

  if (!client) {
    res.json(fallbackAsk(question))
    return
  }

  try {
    const text = await generateText(`
你是"问窟者"，一个栖霞山石窟造像 AI 数字复彩交互档案馆中的中文智能体。
用户身份：${body.audienceType || '文化爱好者'}
当前场景：${body.scene || '栖霞山石窟造像数字复彩网站'}
用户问题：${question}

回答要求：
1. 全程中文，语气沉静、克制、有文化感。
2. 回答不超过 260 字。
3. 解释要清楚，不神秘化，不夸大 AI。
4. 必须区分文化资料、设计推演与 AI 想象。
5. ${boundary}
6. 严格输出合法的 JSON 格式，不要添加额外文本：
{"answer":"...","caveat":"...","suggestedQuestions":["...","...","..."]}
`)

    let cleanText = (text || '{}').trim()
    if (cleanText.startsWith('```')) {
      const lines = cleanText.split('\n')
      if (lines[0].startsWith('```')) lines.shift()
      if (lines.length && lines[lines.length - 1].trim() === '```') lines.pop()
      cleanText = lines.join('\n').trim()
    }

    const parsed = JSON.parse(cleanText) as Partial<AskResponse>
    res.json({
      answer: parsed.answer || fallbackAsk(question).answer,
      caveat: parsed.caveat || boundary,
      suggestedQuestions: parsed.suggestedQuestions || fallbackAsk(question).suggestedQuestions,
      source: 'openai',
    } satisfies AskResponse)
  } catch (error) {
    console.error('API /api/ask 异常:', error)
    res.json(fallbackAsk(question))
  }
}
