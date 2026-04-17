import type { NextRequest } from 'next/server';
import { query, queryOne, update } from '@/lib/db';
import { getTeamFromJoinOrder } from '@/types/game';

interface GameRow {
  id: number;
  status: string;
  max_players: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const playerName = body.playerName?.trim();

    if (!playerName) {
      return Response.json({ error: 'Player name is required' }, { status: 400 });
    }

    const game = await queryOne<GameRow>(
      'SELECT id, status, max_players FROM games WHERE code = ?',
      [code]
    );
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'lobby' && game.status !== 'adding_words') {
      return Response.json({ error: 'Game is no longer accepting players' }, { status: 400 });
    }

    // Check name not taken
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM game_players WHERE game_id = ? AND player_name = ?',
      [game.id, playerName]
    );
    if (existing) {
      return Response.json({ error: 'Name already taken in this game' }, { status: 409 });
    }

    // Atomic insert with count check to prevent race condition
    // Use update() which returns affectedRows from ResultSetHeader
    // Team is set to 'A' as placeholder; updated immediately after based on join_order
    const affectedRows = await update(
      `INSERT INTO game_players (game_id, player_name, join_order, team, is_host, words_submitted, is_connected)
       SELECT ?, ?, COUNT(*) + 1, 'A', FALSE, FALSE, TRUE
       FROM game_players WHERE game_id = ?
       HAVING COUNT(*) < ?`,
      [game.id, playerName, game.id, game.max_players]
    );

    if (affectedRows === 0) {
      return Response.json({ error: 'Game is full' }, { status: 400 });
    }

    // Get the inserted player to determine actual join_order and team
    const newPlayer = await queryOne<{ id: number; join_order: number }>(
      'SELECT id, join_order FROM game_players WHERE game_id = ? AND player_name = ? ORDER BY id DESC LIMIT 1',
      [game.id, playerName]
    );
    if (!newPlayer) {
      return Response.json({ error: 'Game is full' }, { status: 400 });
    }

    const joinOrder = newPlayer.join_order;
    const team = getTeamFromJoinOrder(joinOrder);

    // Update the team (couldn't calculate in INSERT since getTeamFromJoinOrder is JS-side)
    await update(
      'UPDATE game_players SET team = ? WHERE id = ?',
      [team, newPlayer.id]
    );

    return Response.json({ playerId: newPlayer.id, team, joinOrder }, { status: 201 });
  } catch (err) {
    console.error('Join game error:', err);
    return Response.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
