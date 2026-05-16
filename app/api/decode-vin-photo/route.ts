import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request: Request) {
  const { base64, mimeType } = await request.json()

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: 'Extract the VIN number from this image. A VIN is exactly 17 characters, containing only letters and numbers (no I, O, or Q). Return ONLY the VIN number, nothing else. If you cannot find a VIN, return "NOT_FOUND".',
          },
        ],
      },
    ],
  })

  const vin = (response.content[0] as { text: string }).text.trim().toUpperCase()
  return NextResponse.json({ vin: vin === 'NOT_FOUND' ? null : vin })
}
