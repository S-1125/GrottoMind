import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'
import type { AskRequest, AskResponse, RecolorCardRequest, RecolorCardResponse } from '../src/types'

dotenv.config({ path: '.env.local' })
dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini'
const apiKey = process.env.OPENAI_API_KEY
const client = apiKey ? new OpenAI({ apiKey }) : null

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const boundary =
  '当涉及历史色彩、造像原貌、文物修复时，必须说明这是数字复彩推演，不应表述为绝对历史事实。'

function fallbackAsk(question: string): AskResponse {
  return {
    answer: `关于“${question}”，可以从三个层次理解：第一，栖霞山石窟造像是六朝佛教艺术、山寺空间与金陵地域记忆交汇的文化遗产；第二，数字复彩用于帮助观众看见色彩可能性、材质层次和风化痕迹；第三，AI 在这里承担导览、解释和生成辅助，而不是替代文物研究。`,
    caveat: boundary,
    suggestedQuestions: ['数字复彩和修复有什么区别？', '为什么要保留风化痕迹？', '共创卡片怎样避免误导？'],
    source: 'fallback',
  }
}

function fallbackCard(body: RecolorCardRequest): RecolorCardResponse {
  return {
    title: `${body.colorTone}入${body.imagery}`,
    keywords: [body.imagery, body.emotion, body.colorTone, '数字复彩'],
    palette: ['#2f302c', '#724b35', '#a54835', '#d3b16f'],
    interpretation: `以${body.imagery}为意象，以${body.emotion}为情绪，让${body.colorTone}从岩壁暗部缓慢显影。色彩不是覆盖历史，而是以数字方式唤醒一段可被讨论的视觉记忆。`,
    source: 'fallback',
  }
}

async function generateText(input: string) {
  if (!client) return null

  const response = await client.responses.create({
    model,
    input,
  })

  return response.output_text
}

app.post('/api/ask', async (request, response) => {
  const body = request.body as AskRequest
  const question = String(body.question || '').trim()

  if (!question) {
    response.status(400).send('问题不能为空')
    return
  }

  if (!client) {
    response.json(fallbackAsk(question))
    return
  }

  try {
    const text = await generateText(`
你是“问窟者”，一个栖霞山石窟造像 AI 数字复彩交互档案馆中的中文智能体。
用户身份：${body.audienceType}
当前场景：${body.scene || '栖霞山石窟造像数字复彩网站'}
用户问题：${question}

回答要求：
1. 全程中文，语气沉静、克制、有文化感。
2. 回答不超过 260 字。
3. 解释要清楚，不神秘化，不夸大 AI。
4. 必须区分文化资料、设计推演与 AI 想象。
5. ${boundary}
6. 输出 JSON，格式为：
{"answer":"...","caveat":"...","suggestedQuestions":["...","...","..."]}
`)

    const parsed = JSON.parse(text || '{}') as Omit<AskResponse, 'source'>
    response.json({
      answer: parsed.answer || fallbackAsk(question).answer,
      caveat: parsed.caveat || boundary,
      suggestedQuestions: parsed.suggestedQuestions || fallbackAsk(question).suggestedQuestions,
      source: 'openai',
    } satisfies AskResponse)
  } catch (error) {
    console.error(error)
    response.json(fallbackAsk(question))
  }
})

app.post('/api/recolor-card', async (request, response) => {
  const body = request.body as RecolorCardRequest

  if (!body.imagery || !body.emotion || !body.colorTone) {
    response.status(400).send('请选择意象、情绪与色彩倾向')
    return
  }

  if (!client) {
    response.json(fallbackCard(body))
    return
  }

  try {
    const text = await generateText(`
你是“问窟者”，请为栖霞山石窟数字复彩共创模块生成一张中文色彩记忆卡。
用户选择：
意象：${body.imagery}
情绪：${body.emotion}
色彩倾向：${body.colorTone}

要求：
1. 标题 4 到 6 个汉字，有诗意但不要玄虚。
2. keywords 给 4 个中文关键词。
3. palette 给 4 个十六进制颜色，低饱和，适合岩壁、朱砂、暗金、丹枫或矿物色。
4. interpretation 70 到 110 字。
5. 必须说明这是数字复彩推演，不代表历史原貌。
6. 输出 JSON，格式为：
{"title":"...","keywords":["..."],"palette":["#..."],"interpretation":"..."}
`)

    const parsed = JSON.parse(text || '{}') as Omit<RecolorCardResponse, 'source'>
    response.json({
      title: parsed.title || fallbackCard(body).title,
      keywords: parsed.keywords || fallbackCard(body).keywords,
      palette: parsed.palette || fallbackCard(body).palette,
      interpretation: parsed.interpretation || fallbackCard(body).interpretation,
      source: 'openai',
    } satisfies RecolorCardResponse)
  } catch (error) {
    console.error(error)
    response.json(fallbackCard(body))
  }
})

app.listen(port, () => {
  console.log(`问窟者 API 已启动：http://localhost:${port}`)
})
