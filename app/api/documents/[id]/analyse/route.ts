import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface DocumentAnalysis {
  summary: string
  document_type: string
  key_dates: { label: string; date: string }[]
  key_amounts: { label: string; amount: string; currency?: string }[]
  policy_number?: string
  provider?: string
  renewal_suggestion?: {
    name: string
    renewal_date: string
    amount?: number
    category: string
  }
  action_items: string[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const hid = session.user.householdId

  // Load document metadata
  const docRes = await db.execute({
    sql: `SELECT id, name, category, blob_url, file_size FROM documents WHERE id = ? AND household_id = ?`,
    args: [id, hid],
  })

  if (docRes.rows.length === 0) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  type DocRow = { id: string; name: string; category: string; blob_url: string; file_size: number }
  const doc = docRes.rows[0] as unknown as DocRow

  // Fetch the document from Vercel Blob
  let fileContent: string | null = null
  let mediaType = 'application/pdf'

  try {
    const fileRes = await fetch(doc.blob_url)
    if (!fileRes.ok) throw new Error('Could not fetch document')

    const contentType = fileRes.headers.get('content-type') || 'application/pdf'
    mediaType = contentType.includes('pdf') ? 'application/pdf' : contentType

    // Only analyse PDFs and images (Claude-supported formats)
    if (!mediaType.includes('pdf') && !mediaType.startsWith('image/')) {
      return NextResponse.json({
        error: 'Only PDF and image files can be analysed by AI. Other formats (Word, Excel) are not supported.',
      }, { status: 422 })
    }

    const buffer = await fileRes.arrayBuffer()
    fileContent = Buffer.from(buffer).toString('base64')
  } catch {
    return NextResponse.json({ error: 'Could not retrieve document for analysis' }, { status: 500 })
  }

  const systemPrompt = `You are a UK financial document analyst. Extract structured information from financial documents and identify actionable insights.

Always respond in JSON matching this exact structure:
{
  "summary": "2-3 sentence plain English summary of what this document is",
  "document_type": "e.g. Insurance Policy / Pension Statement / Mortgage Offer / Tax Return",
  "key_dates": [{"label": "Policy start", "date": "YYYY-MM-DD"}, ...],
  "key_amounts": [{"label": "Annual premium", "amount": "1234.56", "currency": "GBP"}, ...],
  "policy_number": "optional",
  "provider": "insurance company or institution name",
  "renewal_suggestion": {
    "name": "e.g. Home Insurance - Aviva",
    "renewal_date": "YYYY-MM-DD",
    "amount": 1234.56,
    "category": "insurance | mortgage | pension | subscription | other"
  },
  "action_items": ["e.g. Review coverage level — amounts may be below replacement value", ...]
}

If a field is not present in the document, omit it or return null. For renewal_suggestion only include if the document has a clear renewal/expiry date.`

  try {
    const content: Anthropic.MessageParam['content'] = [
      {
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType as 'application/pdf',
          data: fileContent,
        },
        title: doc.name,
        context: `This is a ${doc.category.replace('_', ' ')} document from a UK household financial management app.`,
      },
      {
        type: 'text' as const,
        text: 'Please analyse this financial document and extract the key information as JSON.',
      },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const analysis: DocumentAnalysis = JSON.parse(jsonMatch[0])
    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: 'Analysis failed — please try again' }, { status: 500 })
  }
}
