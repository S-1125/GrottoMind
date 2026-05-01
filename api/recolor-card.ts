import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import type { RecolorCardRequest, RecolorCardResponse } from '../src/types'

const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini'
const apiKey = process.env.OPENAI_API_KEY
const client = apiKey ? new OpenAI({ apiKey }) : null

function fallbackCard(body: RecolorCardRequest): RecolorCardResponse {
  return {
    title: `${body.colorTone}入${body.imagery}`,
    keywords: [body.imagery!, body.emotion!, body.colorTone!, '数字复彩'],
    palette: ['#2f302c', '#724b35', '#a54835', '#d3b16f'],
    interpretation: `以${body.imagery}为意象，以${body.emotion}为情绪，让${body.colorTone}从岩壁暗部缓慢显影。色彩不是覆盖历史，而是以数字方式唤醒一段可被讨论的视觉记忆。`,
    source: 'fallback',
  }
}

async function generateText(input: string) {
  if (!client) return null
  const response = await client.responses.create({ model, input })
  return response.output_text
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    res.status(405).json({ error: '仅支持 POST 请求' })
    return
  }

  const body = req.body as RecolorCardRequest

  if (!body.imagery || !body.emotion || !body.colorTone) {
    res.status(400).send('请选择意象、情绪与色彩倾向')
    return
  }

  if (!client) {
    res.json(fallbackCard(body))
    return
  }

  try {
    const text = await generateText(`
你是"问窟者"，请为栖霞山石窟数字复彩共创模块生成一张中文色彩记忆卡。
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
    res.json({
      title: parsed.title || fallbackCard(body).title,
      keywords: parsed.keywords || fallbackCard(body).keywords,
      palette: parsed.palette || fallbackCard(body).palette,
      interpretation: parsed.interpretation || fallbackCard(body).interpretation,
      source: 'openai',
    } satisfies RecolorCardResponse)
  } catch (error) {
    console.error(error)
    res.json(fallbackCard(body))
  }
}
