import type {
  GamePhase,
  Team,
  RoundNumber,
  GameSettings,
  TeamScores,
  TurnState,
  RoundType,
} from '@/types/game';
import { getRoundConfig, getTeamFromJoinOrder } from '@/types/game';

export interface EnginePlayer {
  id: number;
  name: string;
  team: Team;
  joinOrder: number;
  isHost: boolean;
  wordsSubmitted: boolean;
  connected: boolean;
  socketId: string | null;
}

export interface EngineWord {
  id: number;
  text: string;
}

export interface EngineState {
  gameId: number;
  code: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Map<number, EnginePlayer>;
  words: EngineWord[];
  currentRound: RoundNumber;
  turnOrder: number[]; // player IDs
  currentTurnIndex: number;
  turnState: TurnState | null;
  currentWordId: number | null;
  roundPool: number[]; // word IDs still in pool for current round
  scores: TeamScores;
  turnTimer: ReturnType<typeof setTimeout> | null;
}

function emptyScores(): TeamScores {
  return {
    A: { round1: 0, round2: 0, round3: 0, total: 0 },
    B: { round1: 0, round2: 0, round3: 0, total: 0 },
  };
}

export class GameEngine {
  state: EngineState;

  constructor(gameId: number, code: string, settings: GameSettings) {
    this.state = {
      gameId,
      code,
      phase: 'lobby',
      settings,
      players: new Map(),
      words: [],
      currentRound: 1,
      turnOrder: [],
      currentTurnIndex: 0,
      turnState: null,
      currentWordId: null,
      roundPool: [],
      scores: emptyScores(),
      turnTimer: null,
    };
  }

  // --- Player Management ---

  addPlayer(id: number, name: string, joinOrder: number, isHost: boolean, socketId: string | null): EnginePlayer {
    const team = getTeamFromJoinOrder(joinOrder);
    const player: EnginePlayer = {
      id, name, team, joinOrder, isHost,
      wordsSubmitted: false, connected: true, socketId,
    };
    this.state.players.set(id, player);
    return player;
  }

  removePlayer(id: number): void {
    this.state.players.delete(id);
    // Remove from turn order to prevent stale references
    const idx = this.state.turnOrder.indexOf(id);
    if (idx !== -1) {
      this.state.turnOrder.splice(idx, 1);
      // Adjust currentTurnIndex if needed
      if (this.state.turnOrder.length > 0) {
        if (idx < this.state.currentTurnIndex) {
          this.state.currentTurnIndex--;
        } else if (this.state.currentTurnIndex >= this.state.turnOrder.length) {
          this.state.currentTurnIndex = 0;
        }
      }
    }
  }

  setPlayerConnected(id: number, connected: boolean, socketId: string | null): void {
    const p = this.state.players.get(id);
    if (p) {
      p.connected = connected;
      p.socketId = socketId;
    }
  }

  markWordsSubmitted(playerId: number): void {
    const p = this.state.players.get(playerId);
    if (p) p.wordsSubmitted = true;
  }

  allWordsSubmitted(): boolean {
    for (const p of this.state.players.values()) {
      if (!p.wordsSubmitted) return false;
    }
    return true;
  }

  // --- Phase Transitions ---

  startWordsPhase(): void {
    this.state.phase = 'adding_words';
  }

  setWords(words: EngineWord[]): void {
    this.state.words = words;
  }

  startGame(): { firstPlayerId: number; turnOrder: number[] } {
    if (this.state.phase !== 'adding_words' && this.state.phase !== 'lobby') {
      throw new Error('Cannot start game from phase: ' + this.state.phase);
    }
    this.state.phase = 'playing';
    this.state.currentRound = 1;
    this.buildTurnOrder();
    this.state.currentTurnIndex = 0;
    this.resetRoundPool();

    return {
      firstPlayerId: this.state.turnOrder[0],
      turnOrder: [...this.state.turnOrder],
    };
  }

  // --- Turn Order ---

  private buildTurnOrder(): void {
    const players = Array.from(this.state.players.values()).sort((a, b) => a.joinOrder - b.joinOrder);
    const teamA = players.filter((p) => p.team === 'A');
    const teamB = players.filter((p) => p.team === 'B');
    const order: number[] = [];
    const maxLen = Math.max(teamA.length, teamB.length);
    for (let i = 0; i < maxLen; i++) {
      if (teamA[i]) order.push(teamA[i].id);
      if (teamB[i]) order.push(teamB[i].id);
    }
    this.state.turnOrder = order;
  }

  getCurrentTurnPlayerId(): number | null {
    if (this.state.turnOrder.length === 0) return null;
    return this.state.turnOrder[this.state.currentTurnIndex % this.state.turnOrder.length];
  }

  getNextTurnPlayerId(): number | null {
    if (this.state.turnOrder.length === 0) return null;
    const next = (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
    return this.state.turnOrder[next];
  }

  advanceTurn(): number {
    const len = this.state.turnOrder.length;
    // Try to find next connected player (max full cycle to avoid infinite loop)
    for (let i = 0; i < len; i++) {
      this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % len;
      const playerId = this.state.turnOrder[this.state.currentTurnIndex];
      const player = this.state.players.get(playerId);
      if (player?.connected) return playerId;
    }
    // All disconnected — return whoever is next anyway
    this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % len;
    return this.state.turnOrder[this.state.currentTurnIndex];
  }

  // --- Round Pool ---

  private resetRoundPool(): void {
    this.state.roundPool = this.state.words.map((w) => w.id);
    // Shuffle
    for (let i = this.state.roundPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.state.roundPool[i], this.state.roundPool[j]] = [this.state.roundPool[j], this.state.roundPool[i]];
    }
  }

  drawWord(): EngineWord | null {
    if (this.state.roundPool.length === 0) return null;
    const wordId = this.state.roundPool[0];
    this.state.currentWordId = wordId;
    return this.state.words.find((w) => w.id === wordId) || null;
  }

  markCorrect(): { team: Team; roundNumber: RoundNumber; newScore: number; wordsRemaining: number } | null {
    if (this.state.currentWordId === null || !this.state.turnState) return null;
    if (this.state.phase !== 'playing') return null;

    // Remove from pool
    this.state.roundPool = this.state.roundPool.filter((id) => id !== this.state.currentWordId);

    // Score
    const team = this.state.turnState.team;
    const round = this.state.currentRound;
    const scoreKey = `round${round}` as `round${1 | 2 | 3}`;
    this.state.scores[team][scoreKey]++;
    this.state.scores[team].total++;
    this.state.turnState.wordsCorrect++;

    const newScore = this.state.scores[team].total;
    this.state.currentWordId = null;

    return { team, roundNumber: round, newScore, wordsRemaining: this.state.roundPool.length };
  }

  markSkip(): { wordsRemaining: number; skipsUsed: number; skipsMax: number } | null {
    if (this.state.currentWordId === null || !this.state.turnState) return null;
    if (this.state.phase !== 'playing') return null;

    const config = getRoundConfig(this.state.settings, this.state.currentRound);
    // skips >= 999 means unlimited; otherwise enforce limit
    if (config.skips < 999 && this.state.turnState.skipsUsed >= config.skips) return null;

    // If only 1 word left, disallow skip (prevents infinite loop)
    if (this.state.roundPool.length <= 1) return null;

    // Move word to end of pool
    this.state.roundPool = this.state.roundPool.filter((id) => id !== this.state.currentWordId);
    this.state.roundPool.push(this.state.currentWordId!);

    this.state.turnState.skipsUsed++;
    this.state.currentWordId = null;

    return {
      wordsRemaining: this.state.roundPool.length,
      skipsUsed: this.state.turnState.skipsUsed,
      skipsMax: config.skips,
    };
  }

  isRoundComplete(): boolean {
    return this.state.roundPool.length === 0;
  }

  // --- Turn Management ---

  startTurn(playerId: number): TurnState {
    if (this.state.phase !== 'playing') throw new Error('Cannot start turn: game is not in playing phase');
    const player = this.state.players.get(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const config = getRoundConfig(this.state.settings, this.state.currentRound);
    const turnState: TurnState = {
      playerId,
      playerName: player.name,
      team: player.team,
      timerDuration: config.timer,
      timerStartedAt: Date.now(),
      skipsUsed: 0,
      skipsMax: config.skips,
      wordsCorrect: 0,
    };

    this.state.turnState = turnState;
    this.state.currentWordId = null;
    return turnState;
  }

  endTurn(): { wordsCorrect: number; wordsSkipped: number; nextPlayerId: number | null } {
    const wordsCorrect = this.state.turnState?.wordsCorrect ?? 0;
    const wordsSkipped = this.state.turnState?.skipsUsed ?? 0;

    if (this.state.turnTimer) {
      clearTimeout(this.state.turnTimer);
      this.state.turnTimer = null;
    }

    this.state.turnState = null;
    this.state.currentWordId = null;

    // If round is complete, don't advance turn yet
    if (this.isRoundComplete()) {
      return { wordsCorrect, wordsSkipped, nextPlayerId: null };
    }

    const nextPlayerId = this.advanceTurn();
    return { wordsCorrect, wordsSkipped, nextPlayerId };
  }

  // --- Round Transitions ---

  endRound(): {
    roundNumber: RoundNumber;
    teamAScore: number;
    teamBScore: number;
    roundWinner: Team | 'tie';
    nextRound: RoundNumber | null;
    nextStartPlayerId: number | null;
  } {
    const round = this.state.currentRound;
    const scoreKey = `round${round}` as `round${1 | 2 | 3}`;
    const aScore = this.state.scores.A[scoreKey];
    const bScore = this.state.scores.B[scoreKey];
    const roundWinner: Team | 'tie' = aScore > bScore ? 'A' : bScore > aScore ? 'B' : 'tie';

    this.state.phase = 'round_results';

    let nextRound: RoundNumber | null = null;
    let nextStartPlayerId: number | null = null;

    if (round < 3) {
      nextRound = (round + 1) as RoundNumber;
      // Last player who played starts the next round
      nextStartPlayerId = this.getCurrentTurnPlayerId();
    }

    return { roundNumber: round, teamAScore: aScore, teamBScore: bScore, roundWinner, nextRound, nextStartPlayerId };
  }

  startNextRound(): RoundNumber {
    if (this.state.currentRound >= 3) {
      throw new Error('No next round after round 3');
    }
    const nextRound = (this.state.currentRound + 1) as RoundNumber;
    this.state.currentRound = nextRound;
    this.state.phase = 'playing';
    this.resetRoundPool();
    // currentTurnIndex stays where it was (last player starts)
    return nextRound;
  }

  // --- Game End ---

  finishGame(): {
    teamATotal: number;
    teamBTotal: number;
    winner: Team | 'tie';
    roundBreakdown: Array<{ round: RoundNumber; teamAScore: number; teamBScore: number }>;
  } {
    this.state.phase = 'finished';

    if (this.state.turnTimer) {
      clearTimeout(this.state.turnTimer);
      this.state.turnTimer = null;
    }

    const aTotal = this.state.scores.A.total;
    const bTotal = this.state.scores.B.total;
    const winner: Team | 'tie' = aTotal > bTotal ? 'A' : bTotal > aTotal ? 'B' : 'tie';

    const roundBreakdown: Array<{ round: RoundNumber; teamAScore: number; teamBScore: number }> = [
      { round: 1, teamAScore: this.state.scores.A.round1, teamBScore: this.state.scores.B.round1 },
      { round: 2, teamAScore: this.state.scores.A.round2, teamBScore: this.state.scores.B.round2 },
      { round: 3, teamAScore: this.state.scores.A.round3, teamBScore: this.state.scores.B.round3 },
    ];

    return { teamATotal: aTotal, teamBTotal: bTotal, winner, roundBreakdown };
  }

  // --- Helpers ---

  getRoundType(): RoundType {
    return getRoundConfig(this.state.settings, this.state.currentRound).type;
  }

  getPlayerById(id: number): EnginePlayer | undefined {
    return this.state.players.get(id);
  }

  getPlayerBySocketId(socketId: string): EnginePlayer | undefined {
    for (const p of this.state.players.values()) {
      if (p.socketId === socketId) return p;
    }
    return undefined;
  }
}
