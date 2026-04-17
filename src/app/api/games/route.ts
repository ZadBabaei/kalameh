import { NextRequest } from 'next/server';
import { insert, query } from '@/lib/db';
import { getTeamFromJoinOrder } from '@/types/game';
import type { CreateGameRequest } from '@/types/game';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateGameRequest = await request.json();
    const { settings, hostName } = body;

    if (!settings?.name?.trim()) {
      return Response.json({ error: 'Game name is required' }, { status: 400 });
    }
    if (!hostName?.trim()) {
      return Response.json({ error: 'Host name is required' }, { status: 400 });
    }
    if (settings.maxPlayers < 4 || settings.maxPlayers > 12 || settings.maxPlayers % 2 !== 0) {
      return Response.json({ error: 'Max players must be an even number between 4 and 12' }, { status: 400 });
    }

    // Validate numeric settings
    const wpp = Number(settings.wordsPerPlayer) || 5;
    if (wpp < 1 || wpp > 20) {
      return Response.json({ error: 'Words per player must be between 1 and 20' }, { status: 400 });
    }
    const t1 = Number(settings.timerRound1) || 45;
    const t2 = Number(settings.timerRound2) || 35;
    const t3 = Number(settings.timerRound3) || 30;
    if ([t1, t2, t3].some(t => t < 15 || t > 90)) {
      return Response.json({ error: 'Timer must be between 15 and 90 seconds' }, { status: 400 });
    }
    const s1 = settings.skipsRound1 ?? 999; // R1 unlimited by default
    const s2 = settings.skipsRound2 ?? 1;
    const s3 = settings.skipsRound3 ?? 0;
    if (s1 !== 999 && (s1 < 0 || s1 > 10)) {
      return Response.json({ error: 'Skips must be between 0 and 10' }, { status: 400 });
    }
    if ([s2, s3].some(s => s < 0 || s > 10)) {
      return Response.json({ error: 'Skips must be between 0 and 10' }, { status: 400 });
    }

    // Generate unique code (retry on collision)
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await query<{ id: number }[]>('SELECT id FROM games WHERE code = ?', [code]);
      if (existing.length === 0) break;
      code = generateCode();
      attempts++;
    }
    if (attempts >= 5) {
      return Response.json({ error: 'Failed to generate unique game code, please try again' }, { status: 503 });
    }

    // Insert game
    const gameId = await insert(
      `INSERT INTO games (code, name, language, max_players, words_per_player,
        timer_round1, timer_round2, timer_round3,
        skips_round1, skips_round2, skips_round3, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lobby')`,
      [
        code, settings.name.trim(), settings.language || 'en',
        settings.maxPlayers, wpp,
        t1, t2, t3,
        s1, s2, s3,
      ]
    );

    // Insert host as first player
    const team = getTeamFromJoinOrder(1);
    const playerId = await insert(
      `INSERT INTO game_players (game_id, player_name, join_order, team, is_host, words_submitted, is_connected)
       VALUES (?, ?, 1, ?, TRUE, FALSE, TRUE)`,
      [gameId, hostName.trim(), team]
    );

    // Update host_player_id
    await query('UPDATE games SET host_player_id = ? WHERE id = ?', [playerId, gameId]);

    // Create round_state rows
    for (let round = 1; round <= 3; round++) {
      await insert(
        'INSERT INTO round_state (game_id, round_number, status, team_a_score, team_b_score) VALUES (?, ?, ?, 0, 0)',
        [gameId, round, 'pending']
      );
    }

    return Response.json({ code, gameId, playerId }, { status: 201 });
  } catch (err) {
    console.error('Create game error:', err);
    return Response.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
