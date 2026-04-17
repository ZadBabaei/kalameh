import type { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';

interface GameRow {
  id: number;
  code: string;
  name: string;
  language: string;
  max_players: number;
  words_per_player: number;
  timer_round1: number;
  timer_round2: number;
  timer_round3: number;
  skips_round1: number;
  skips_round2: number;
  skips_round3: number;
  status: string;
  current_round: number | null;
  host_player_id: number | null;
}

interface PlayerRow {
  id: number;
  game_id: number;
  player_name: string;
  join_order: number;
  team: string;
  is_host: number;
  words_submitted: number;
  is_connected: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const game = await queryOne<GameRow>('SELECT * FROM games WHERE code = ?', [code]);
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const players = await query<PlayerRow[]>(
      'SELECT * FROM game_players WHERE game_id = ? ORDER BY join_order',
      [game.id]
    );

    // Include game words if game is in playing state
    let gameWords: { id: number; word_text: string }[] = [];
    if (game.status === 'playing' || game.status === 'adding_words') {
      gameWords = await query<{ id: number; word_text: string }[]>(
        'SELECT id, word_text FROM game_words WHERE game_id = ?',
        [game.id]
      );
    }

    // Get turn order from DB
    const turnOrderPlayers = await query<{ id: number; team: string; join_order: number }[]>(
      'SELECT id, team, join_order FROM game_players WHERE game_id = ? ORDER BY join_order',
      [game.id]
    );
    const teamAPlayers = turnOrderPlayers.filter(p => p.team === 'A');
    const teamBPlayers = turnOrderPlayers.filter(p => p.team === 'B');
    const turnOrder: number[] = [];
    const maxLen = Math.max(teamAPlayers.length, teamBPlayers.length);
    for (let i = 0; i < maxLen; i++) {
      if (teamAPlayers[i]) turnOrder.push(teamAPlayers[i].id);
      if (teamBPlayers[i]) turnOrder.push(teamBPlayers[i].id);
    }

    return Response.json({
      game: {
        id: game.id,
        code: game.code,
        name: game.name,
        language: game.language,
        status: game.status,
        currentRound: game.current_round,
        hostPlayerId: game.host_player_id,
        settings: {
          name: game.name,
          language: game.language,
          maxPlayers: game.max_players,
          wordsPerPlayer: game.words_per_player,
          timerRound1: game.timer_round1,
          timerRound2: game.timer_round2,
          timerRound3: game.timer_round3,
          skipsRound1: game.skips_round1,
          skipsRound2: game.skips_round2,
          skipsRound3: game.skips_round3,
        },
      },
      players: players.map((p) => ({
        id: p.id,
        gameId: p.game_id,
        playerName: p.player_name,
        joinOrder: p.join_order,
        team: p.team,
        isHost: Boolean(p.is_host),
        wordsSubmitted: Boolean(p.words_submitted),
        isConnected: Boolean(p.is_connected),
      })),
      turnOrder,
      gameWords: gameWords.map(w => ({ id: w.id, text: w.word_text })),
    });
  } catch (err) {
    console.error('Get game error:', err);
    return Response.json({ error: 'Failed to get game' }, { status: 500 });
  }
}
