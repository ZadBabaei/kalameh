import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;

    if (lang !== 'en' && lang !== 'fa') {
      return Response.json({ error: 'Invalid language. Use "en" or "fa"' }, { status: 400 });
    }

    const url = request.nextUrl;
    const search = url.searchParams.get('search') || '';
    const difficulty = url.searchParams.get('difficulty');
    const count = Math.min(Number(url.searchParams.get('count')) || 20, 50);
    const excludeParam = url.searchParams.get('exclude') || '';
    const excludeIds = excludeParam
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);

    const table = lang === 'fa' ? 'words_fa' : 'words_en';
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (search) {
      conditions.push('word LIKE ?');
      values.push(`%${search}%`);
    }
    if (difficulty) {
      conditions.push('difficulty = ?');
      values.push(difficulty);
    }
    if (excludeIds.length > 0) {
      conditions.push(`id NOT IN (${excludeIds.map(() => '?').join(',')})`);
      values.push(...excludeIds);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(count);

    const words = await query<{ id: number; word: string; difficulty: string }[]>(
      `SELECT id, word, difficulty FROM ${table} ${where} ORDER BY RAND() LIMIT ?`,
      values
    );

    return Response.json({ words });
  } catch (err) {
    console.error('Browse words error:', err);
    return Response.json({ error: 'Failed to browse words' }, { status: 500 });
  }
}
