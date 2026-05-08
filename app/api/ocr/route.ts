import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: `Extract all line items from this receipt. Return ONLY a JSON array of objects with "name" (string) and "amount" (number) fields. Do not include tax, subtotal, or total lines — only individual purchased items. Example: [{"name":"Burger","amount":5.99},{"name":"Fries","amount":2.49}]`,
          },
        ],
      },
    ],
    max_tokens: 1024,
  })

  const content = response.choices[0]?.message?.content ?? ''

  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not parse receipt items' }, { status: 422 })
  }

  const items = JSON.parse(jsonMatch[0]) as { name: string; amount: number }[]
  return NextResponse.json({ items })
}
