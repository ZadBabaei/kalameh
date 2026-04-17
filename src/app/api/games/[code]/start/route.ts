import type { NextRequest } from 'next/server';
import { insert, query, queryOne, update } from '@/lib/db';

interface GameRow {
  id: number;
  status: string;
  host_player_id: number;
}

interface PlayerRow {
  id: number;
  join_order: number;
  team: string;
}

interface WordRow {
  id: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { playerId, action } = body;

    if (!playerId) {
      return Response.json({ error: 'playerId is required' }, { status: 400 });
    }

    const game = await queryOne<GameRow>(
      'SELECT id, status, host_player_id FROM games WHERE code = ?',
      [code]
    );
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.host_player_id !== playerId) {
      return Response.json({ error: 'Only the host can start the game' }, { status: 403 });
    }

    // Action: begin_words — move from lobby to adding_words phase
    if (action === 'begin_words' || game.status === 'lobby') {
      if (game.status !== 'lobby') {
        return Response.json({ error: 'Game is not in lobby state' }, { status: 400 });
      }
      await update(
        "UPDATE games SET status = 'adding_words' WHERE id = ?",
        [game.id]
      );
      return Response.json({ success: true, status: 'adding_words' });
    }

    // Action: start_playing — move from adding_words to playing
    if (game.status !== 'adding_words') {
      return Response.json({ error: 'Game cannot be started in current state' }, { status: 400 });
    }

    // Get all words for this game
    const words = await query<WordRow[]>(
      'SELECT id FROM game_words WHERE game_id = ?',
      [game.id]
    );

    if (words.length === 0) {
      return Response.json({ error: 'No words have been submitted yet' }, { status: 400 });
    }

    // Populate round_words for round 1
    for (const word of words) {
      await insert(
        "INSERT IGNORE INTO round_words (game_id, round_number, game_word_id, status) VALUES (?, 1, ?, 'in_pool')",
        [game.id, word.id]
      );
    }

    // Update round_state for round 1
    await update(
      "UPDATE round_state SET status = 'active' WHERE game_id = ? AND round_number = 1",
      [game.id]
    );

    // Calculate turn order: interleave teams
    const players = await query<PlayerRow[]>(
      'SELECT id, join_order, team FROM game_players WHERE game_id = ? ORDER BY join_order',
      [game.id]
    );
    const teamA = players.filter((p) => p.team === 'A');
    const teamB = players.filter((p) => p.team === 'B');
    const turnOrder: number[] = [];
    const maxLen = Math.max(teamA.length, teamB.length);
    for (let i = 0; i < maxLen; i++) {
      if (teamA[i]) turnOrder.push(teamA[i].id);
      if (teamB[i]) turnOrder.push(teamB[i].id);
    }

    const firstPlayerId = turnOrder[0];

    // Update game status
    await update(
      "UPDATE games SET status = 'playing', current_round = 1, current_turn_player_id = ? WHERE id = ?",
      [firstPlayerId, game.id]
    );

    return Response.json({
      success: true,
      status: 'playing',
      currentRound: 1,
      firstPlayerId,
      turnOrder,
      totalWords: words.length,
    });
  } catch (err) {
    console.error('Start game error:', err);
    return Response.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
