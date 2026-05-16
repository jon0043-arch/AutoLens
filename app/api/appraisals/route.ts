import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const appraisals = await sql`
      SELECT * FROM appraisals ORDER BY created_at DESC
    `
    return NextResponse.json(appraisals)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerName, phone, keys, notes, vin, year, make, model, trim, mileage, photos } = body

    const result = await sql`
      INSERT INTO appraisals (
        customer_name, customer_phone, notes,
        vin, year, make, model, trim, mileage,
        photos, status
      ) VALUES (
        ${customerName}, ${phone}, ${notes},
        ${vin}, ${year}, ${make}, ${model}, ${trim}, ${mileage},
        ${JSON.stringify(photos)}, 'pending'
      )
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
