/**
 * Standalone Socket.io server for Kalameh game.
 * Run with: npx tsx src/server/index.ts
 * Deploys separately from the Next.js app (e.g. Railway).
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameEngine, EngineWord } from '../lib/game-engine';
import type { RoundNumber } from '../types/game';

const PORT = Number(process.env.SOCKET_PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// Active games stored in memory
const games = new Map<string, GameEngine>();
const gameLastActivity = new Map<string, number>();

function touchGame(gameCode: string) {
  gameLastActivity.set(gameCode, Date.now());
}

// Clean up abandoned games every 10 minutes
setInterval(() => {
  const now = Date.now();
  const IDLE_TIMEOUT = 60 * 60 * 1000; // 1 hour
  for (const [code, lastActive] of gameLastActivity) {
    if (now - lastActive > IDLE_TIMEOUT) {
      const engine = games.get(code);
      if (engine?.state.turnTimer) clearTimeout(engine.state.turnTimer);
      games.delete(code);
      gameLastActivity.delete(code);
      console.log(`[${code}] Cleaned up idle game`);
    }
  }
}, 10 * 60 * 1000);

io.on('connection', (socket) => {
  const gameCode = socket.handshake.query.gameCode as string;
  const room = `game:${gameCode}`;

  console.log(`[${gameCode}] Socket connected: ${socket.id}`);
  socket.join(room);

  // --- Player Join ---
  socket.on('player:join', (data: { gameCode: string; playerName: string; playerId: number; isHost: boolean; joinOrder: number; settings?: unknown }) => {
    let engine = games.get(data.gameCode);
    if (!engine && data.settings) {
      // Create engine from settings (first player / host)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = data.settings as any;
      engine = new GameEngine(0, data.gameCode, {
        name: s.name || '',
        language: s.language || 'en',
        maxPlayers: s.maxPlayers || 4,
        wordsPerPlayer: s.wordsPerPlayer || 5,
        timerRound1: s.timerRound1 || 45,
        timerRound2: s.timerRound2 || 35,
        timerRound3: s.timerRound3 || 30,
        skipsRound1: s.skipsRound1 ?? 3,
        skipsRound2: s.skipsRound2 ?? 1,
        skipsRound3: s.skipsRound3 ?? 0,
      });
      games.set(data.gameCode, engine);
    }

    if (!engine) return;

    const existing = engine.getPlayerById(data.playerId);
    if (existing) {
      engine.setPlayerConnected(data.playerId, true, socket.id);
    } else {
      engine.addPlayer(data.playerId, data.playerName, data.joinOrder, data.isHost, socket.id);
    }

    // Broadcast player joined
    const player = engine.getPlayerById(data.playerId);
    if (player) {
      socket.to(room).emit('game:player_joined', {
        player: {
          id: player.id,
          playerName: player.name,
          team: player.team,
          joinOrder: player.joinOrder,
          isHost: player.isHost,
        },
      });
    }

    // Send full state to the connecting player
    emitFullState(socket, engine);
  });

  // --- Player Reconnect ---
  socket.on('player:reconnect', (data: { gameCode: string; playerId: number }) => {
    const engine = games.get(data.gameCode);
    if (!engine) return;

    engine.setPlayerConnected(data.playerId, true, socket.id);
    socket.to(room).emit('game:player_reconnected', { playerId: data.playerId });
    emitFullState(socket, engine);

    // Re-send word if this player is the active describer
    if (engine.state.turnState?.playerId === data.playerId && engine.state.currentWordId !== null) {
      const word = engine.state.words.find(w => w.id === engine.state.currentWordId);
      if (word) {
        socket.emit('game:word_for_describer', {
          wordId: word.id,
          wordText: word.text,
        });
      }
    }
  });

  // --- Register other player (without socket) ---
  socket.on('player:register_other', (data: { gameCode: string; playerName: string; playerId: number; isHost: boolean; joinOrder: number }) => {
    const engine = games.get(data.gameCode);
    if (!engine) return;
    const existing = engine.getPlayerById(data.playerId);
    if (!existing) {
      engine.addPlayer(data.playerId, data.playerName, data.joinOrder, data.isHost, null);
    }
  });

  // --- Bootstrap: Start Game (no host socket check) ---
  socket.on('bootstrap:start_game', (data: { gameCode: string; words: EngineWord[]; hostPlayerId: number }) => {
    const engine = games.get(data.gameCode);
    if (!engine) return;

    // Only start if not already playing
    if (engine.state.phase === 'playing') return;

    touchGame(data.gameCode);
    engine.setWords(data.words);

    try {
      const { firstPlayerId, turnOrder } = engine.startGame();

      io.to(room).emit('game:phase_changed', { phase: 'playing', round: 1 });

      const firstPlayer = engine.getPlayerById(firstPlayerId);
      io.to(room).emit('game:turn_started', {
        playerId: firstPlayerId,
        playerName: firstPlayer?.name || '',
        team: firstPlayer?.team || 'A',
        timerDuration: engine.state.settings.timerRound1,
        turnOrder,
        awaitingStart: true,
      });
    } catch (e) {
      console.error(`[${data.gameCode}] Bootstrap start error:`, e);
    }
  });

  // --- Host: Start Words Phase ---
  socket.on('host:start_words_phase', (data: { gameCode: string }) => {
    const engine = games.get(data.gameCode);
    if (!engine) return;

    // Verify sender is the host
    const sender = engine.getPlayerBySocketId(socket.id);
    if (!sender?.isHost) return;

    engine.startWordsPhase();
    touchGame(data.gameCode);
    io.to(room).emit('game:phase_changed', { phase: 'adding_words' });
  });

  // --- Player: Submit Words ---
  socket.on('player:submit_words', (data: { gameCode: string; playerId: number; words: EngineWord[] }) => {
    const engine = games.get(data.gameCode);
    if (!engine) return;

    engine.markWordsSubmitted(data.playerId);

    io.to(room).emit('game:words_progress', {
      playerId: data.playerId,
      submitted: true,
      count: data.words.length,
    });

    // If all submitted, set words on engine
    if (engine.allWordsSubmitted()) {
      // Words should have been set via the REST API. Signal readiness.
      io.to(room).emit('game:all_words_submitted', {});
    }
  });

  // --- Host: Start Game ---
  socket.on('host:start_game', (data: { gameCode: string; words: EngineWord[] }) => {
    const engine = games.get(data.gameCode);
    if (!engine) return;

    // Verify sender is the host
    const sender = engine.getPlayerBySocketId(socket.id);
    if (!sender?.isHost) return;

    touchGame(data.gameCode);
    engine.setWords(data.words);
    const { firstPlayerId, turnOrder } = engine.startGame();

    io.to(room).emit('game:phase_changed', { phase: 'playing', round: 1 });

    // Tell everyone who goes first
    const firstPlayer = engine.getPlayerById(firstPlayerId);
    io.to(room).emit('game:turn_started', {
      playerId: firstPlayerId,
      playerName: firstPlayer?.name || '',
      team: firstPlayer?.team || 'A',
      timerDuration: engine.state.settings.timerRound1,
      turnOrder,
      awaitingStart: true, // Player must click Start
    });
  });

  // --- Player: Start Turn ---
  socket.on('player:start_turn', (data: { gameCode: string; playerId: number }) => {
    const engine = games.get(data.gameCode);
    if (!engine) return;

    // Verify socket identity matches the claimed playerId
    const socketPlayer = engine.getPlayerBySocketId(socket.id);
    if (!socketPlayer || socketPlayer.id !== data.playerId) return;

    const currentPlayerId = engine.getCurrentTurnPlayerId();
    if (currentPlayerId !== data.playerId) return; // Not your turn

    touchGame(data.gameCode);
    const turnState = engine.startTurn(data.playerId);

    // Start server-side timer
    engine.state.turnTimer = setTimeout(() => {
      handleTimerExpired(data.gameCode);
    }, turnState.timerDuration * 1000);

    // Draw first word and send only to describer
    const word = engine.drawWord();
    if (word) {
      const player = engine.getPlayerById(data.playerId);
      if (player?.socketId) {
        io.to(player.socketId).emit('game:word_for_describer', {
          wordId: word.id,
          wordText: word.text,
        });
      }
    }

    // Notify everyone the turn has truly started (timer running)
    io.to(room).emit('game:turn_started', {
      playerId: data.playerId,
      playerName: turnState.playerName,
      team: turnState.team,
      timerDuration: turnState.timerDuration,
      awaitingStart: false,
    });
  });

  // --- Player: Correct ---
  socket.on('player:correct', (data: { gameCode: string; playerId: number }) => {
    const engine = games.get(data.gameCode);
    if (!engine || engine.state.turnState?.playerId !== data.playerId) return;

    // Verify socket identity
    const socketPlayer = engine.getPlayerBySocketId(socket.id);
    if (!socketPlayer || socketPlayer.id !== data.playerId) return;

    touchGame(data.gameCode);

    const result = engine.markCorrect();
    if (!result) return;

    io.to(room).emit('game:correct', result);

    // Check if round is complete
    if (engine.isRoundComplete()) {
      handleRoundComplete(data.gameCode);
      return;
    }

    // Draw next word for describer
    const nextWord = engine.drawWord();
    if (nextWord) {
      const player = engine.getPlayerById(data.playerId);
      if (player?.socketId) {
        io.to(player.socketId).emit('game:word_for_describer', {
          wordId: nextWord.id,
          wordText: nextWord.text,
        });
      }
    }
  });

  // --- Player: Skip ---
  socket.on('player:skip', (data: { gameCode: string; playerId: number }) => {
    const engine = games.get(data.gameCode);
    if (!engine || engine.state.turnState?.playerId !== data.playerId) return;

    // Verify socket identity
    const socketPlayer = engine.getPlayerBySocketId(socket.id);
    if (!socketPlayer || socketPlayer.id !== data.playerId) return;

    touchGame(data.gameCode);

    const result = engine.markSkip();
    if (!result) {
      socket.emit('game:error', { message: 'No skips remaining' });
      return;
    }

    io.to(room).emit('game:skip', result);

    // Draw next word for describer
    const nextWord = engine.drawWord();
    if (nextWord) {
      const player = engine.getPlayerById(data.playerId);
      if (player?.socketId) {
        io.to(player.socketId).emit('game:word_for_describer', {
          wordId: nextWord.id,
          wordText: nextWord.text,
        });
      }
    }
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`[${gameCode}] Socket disconnected: ${socket.id}`);

    const engine = games.get(gameCode);
    if (!engine) return;

    const player = engine.getPlayerBySocketId(socket.id);
    if (!player) return;

    engine.setPlayerConnected(player.id, false, null);
    socket.to(room).emit('game:player_disconnected', { playerId: player.id });

    // If the disconnected player was the active describer, end their turn
    if (engine.state.turnState?.playerId === player.id) {
      // Clear the pending timer first to prevent double-fire
      if (engine.state.turnTimer) {
        clearTimeout(engine.state.turnTimer);
        engine.state.turnTimer = null;
      }
      handleTimerExpired(gameCode);
    }
  });
});

// --- Timer Expired Handler ---
function handleTimerExpired(gameCode: string) {
  const engine = games.get(gameCode);
  if (!engine || !engine.state.turnState) return;

  const room = `game:${gameCode}`;

  // Capture turn state BEFORE endTurn nullifies it
  const currentTurnPlayerId = engine.state.turnState.playerId;
  const result = engine.endTurn();

  io.to(room).emit('game:turn_ended', {
    playerId: currentTurnPlayerId,
    wordsCorrect: result.wordsCorrect,
    wordsSkipped: result.wordsSkipped,
    nextPlayerId: result.nextPlayerId,
    nextPlayerName: result.nextPlayerId ? engine.getPlayerById(result.nextPlayerId)?.name || null : null,
  });

  // If round complete (pool emptied during this turn before timer)
  if (engine.isRoundComplete()) {
    handleRoundComplete(gameCode);
  }
}

// --- Round Complete Handler ---
function handleRoundComplete(gameCode: string) {
  const engine = games.get(gameCode);
  if (!engine) return;

  const room = `game:${gameCode}`;

  // End turn if still active
  if (engine.state.turnState) {
    engine.endTurn();
  }

  const roundResult = engine.endRound();
  io.to(room).emit('game:round_ended', roundResult);

  if (roundResult.nextRound) {
    // After a delay, start next round
    setTimeout(() => {
      const nextRound = engine.startNextRound();
      io.to(room).emit('game:phase_changed', { phase: 'playing', round: nextRound });

      const nextPlayerId = engine.getCurrentTurnPlayerId();
      const nextPlayer = nextPlayerId ? engine.getPlayerById(nextPlayerId) : null;

      if (nextPlayer) {
        io.to(room).emit('game:turn_started', {
          playerId: nextPlayer.id,
          playerName: nextPlayer.name,
          team: nextPlayer.team,
          timerDuration: engine.state.settings[`timerRound${nextRound}` as `timerRound${1 | 2 | 3}`],
          awaitingStart: true,
        });
      }
    }, 5000); // 5 second pause between rounds
  } else {
    // Game over (was round 3)
    const finalResult = engine.finishGame();
    io.to(room).emit('game:finished', finalResult);

    // Clean up after 5 minutes
    setTimeout(() => {
      games.delete(gameCode);
    }, 5 * 60 * 1000);
  }
}

// --- Full State Sync ---
function emitFullState(socket: { emit: (event: string, data: unknown) => void }, engine: GameEngine) {
  const players = Array.from(engine.state.players.values()).map((p) => ({
    id: p.id,
    playerName: p.name,
    team: p.team,
    joinOrder: p.joinOrder,
    isHost: p.isHost,
    wordsSubmitted: p.wordsSubmitted,
    isConnected: p.connected,
  }));

  socket.emit('game:state', {
    code: engine.state.code,
    phase: engine.state.phase,
    settings: engine.state.settings,
    players,
    currentRound: engine.state.currentRound,
    turnOrder: engine.state.turnOrder,
    currentTurn: engine.state.turnState ? {
      playerId: engine.state.turnState.playerId,
      playerName: engine.state.turnState.playerName,
      team: engine.state.turnState.team,
      timerDuration: engine.state.turnState.timerDuration,
      timerStartedAt: engine.state.turnState.timerStartedAt,
      skipsUsed: engine.state.turnState.skipsUsed,
      skipsMax: engine.state.turnState.skipsMax,
      wordsCorrect: engine.state.turnState.wordsCorrect,
    } : null,
    scores: engine.state.scores,
    wordsRemaining: engine.state.roundPool.length,
    wordsTotal: engine.state.words.length,
  });
}

httpServer.listen(PORT, () => {
  console.log(`Kalameh Socket.io server running on port ${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});
