import type { NextRequest } from 'next/server';
import { insert, query, queryOne, update } from '@/lib/db';

interface GameRow {
  id: number;
  language: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const url = request.nextUrl;
    const search = url.searchParams.get('search') || '';
    const difficulty = url.searchParams.get('difficulty');
    const count = Math.min(Number(url.searchParams.get('count')) || 20, 50);
    const playerId = Number(url.searchParams.get('playerId')) || 0;

    const game = await queryOne<GameRow>('SELECT id, language FROM games WHERE code = ?', [code]);
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const LANG_TABLES: Record<string, string> = { fa: 'words_fa', en: 'words_en' };
    const table = LANG_TABLES[game.language];
    if (!table) {
      return Response.json({ error: 'Unsupported language' }, { status: 400 });
    }

    const conditions: string[] = [];
    const values: unknown[] = [];

    // Modulo partitioning: each player only sees words from their partition
    if (playerId) {
      const player = await queryOne<{ join_order: number }>(
        'SELECT join_order FROM game_players WHERE id = ? AND game_id = ?',
        [playerId, game.id]
      );
      const totalPlayers = await queryOne<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM game_players WHERE game_id = ?',
        [game.id]
      );
      if (player && totalPlayers && totalPlayers.cnt > 0) {
        const playerIndex = (player.join_order - 1) % totalPlayers.cnt;
        const playerCount = totalPlayers.cnt;
        conditions.push(`id % ${Math.floor(playerCount)} = ${Math.floor(playerIndex)}`);
      }
    }

    if (search) {
      conditions.push('word LIKE ?');
      values.push(`%${search}%`);
    }
    if (difficulty) {
      conditions.push('difficulty = ?');
      values.push(difficulty);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeCount = Math.max(1, Math.min(Math.floor(count), 50));

    const words = await query<{ id: number; word: string; difficulty: string }[]>(
      `SELECT id, word, difficulty FROM ${table} ${where} ORDER BY RAND() LIMIT ${safeCount}`,
      values
    );

    return Response.json({ words });
  } catch (err) {
    console.error('Search words error:', err);
    return Response.json({ error: 'Failed to search words' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { playerId, words } = body;

    if (!playerId || !Array.isArray(words) || words.length === 0) {
      return Response.json({ error: 'playerId and words array are required' }, { status: 400 });
    }

    const game = await queryOne<GameRow>('SELECT id, language FROM games WHERE code = ?', [code]);
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify player belongs to this game and hasn't already submitted
    const player = await queryOne<{ id: number; words_submitted: number }>(
      'SELECT id, words_submitted FROM game_players WHERE id = ? AND game_id = ?',
      [playerId, game.id]
    );
    if (!player) {
      return Response.json({ error: 'Player not found in this game' }, { status: 400 });
    }
    if (player.words_submitted) {
      return Response.json({ error: 'Words already submitted' }, { status: 400 });
    }

    // Validate word count
    const maxWords = game.language ? (await queryOne<{ words_per_player: number }>('SELECT words_per_player FROM games WHERE id = ?', [game.id]))?.words_per_player || 5 : 5;
    if (words.length > maxWords) {
      return Response.json({ error: `Maximum ${maxWords} words allowed` }, { status: 400 });
    }

    let inserted = 0;
    let duplicatesSkipped = 0;

    for (const word of words) {
      const text = word.text?.trim();
      if (!text) continue;

      try {
        await insert(
          `INSERT IGNORE INTO game_words (game_id, submitted_by_player_id, word_text, source_word_id, is_custom)
           VALUES (?, ?, ?, ?, ?)`,
          [game.id, playerId, text, word.sourceWordId || null, word.isCustom ? 1 : 0]
        );
        inserted++;
      } catch {
        duplicatesSkipped++;
      }
    }

    // Mark player as submitted
    await update(
      'UPDATE game_players SET words_submitted = TRUE WHERE id = ?',
      [playerId]
    );

    // Check if all players have submitted
    const pending = await query<{ id: number }[]>(
      'SELECT id FROM game_players WHERE game_id = ? AND words_submitted = FALSE',
      [game.id]
    );

    let allSubmitted = false;
    if (pending.length === 0) {
      allSubmitted = true;

      // All words are in — set up round 1 and move to playing
      const allWords = await query<{ id: number }[]>(
        'SELECT id FROM game_words WHERE game_id = ?',
        [game.id]
      );
      for (const w of allWords) {
        await insert(
          "INSERT IGNORE INTO round_words (game_id, round_number, game_word_id, status) VALUES (?, 1, ?, 'in_pool')",
          [game.id, w.id]
        );
      }

      await update(
        "UPDATE round_state SET status = 'active' WHERE game_id = ? AND round_number = 1",
        [game.id]
      );

      // Calculate turn order: interleave teams
      const allPlayers = await query<{ id: number; join_order: number; team: string }[]>(
        'SELECT id, join_order, team FROM game_players WHERE game_id = ? ORDER BY join_order',
        [game.id]
      );
      const teamA = allPlayers.filter((p) => p.team === 'A');
      const teamB = allPlayers.filter((p) => p.team === 'B');
      const turnOrder: number[] = [];
      const maxLen = Math.max(teamA.length, teamB.length);
      for (let i = 0; i < maxLen; i++) {
        if (teamA[i]) turnOrder.push(teamA[i].id);
        if (teamB[i]) turnOrder.push(teamB[i].id);
      }
      const firstPlayerId = turnOrder[0];

      await update(
        "UPDATE games SET status = 'playing', current_round = 1, current_turn_player_id = ? WHERE id = ?",
        [firstPlayerId, game.id]
      );
    }

    return Response.json({ inserted, duplicatesSkipped, allSubmitted });
  } catch (err) {
    console.error('Submit words error:', err);
    return Response.json({ error: 'Failed to submit words' }, { status: 500 });
  }
}
