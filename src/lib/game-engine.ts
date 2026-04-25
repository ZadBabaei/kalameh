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

// Per-round behavior rules. Allows Round 3 to be customized independently later.
export interface RoundRules {
  timer: number;
  skipPolicy: 'unlimited' | 'perRoundLimit' | 'oncePerTurn';
  skipLimit: number; // used when skipPolicy === 'perRoundLimit'
  type: RoundType;
}

export interface EngineState {
  gameId: number;
  code: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Map<number, EnginePlayer>;
  words: EngineWord[];
  currentRound: RoundNumber;

  turnOrder: number[];        // player IDs in random, alternated order
  currentTurnIndex: number;
  lastDescriberId: number | null; // player who emptied the bowl (starts next round)

  turnState: (TurnState & { usedSkipThisTurn: boolean }) | null;
  currentWordId: number | null;

  mainBowl: number[];         // wordIds still in the main bowl this round
  collectedWords: number[];   // wordIds correctly guessed this round

  scores: TeamScores;
  turnTimer: ReturnType<typeof setTimeout> | null;
}

function emptyScores(): TeamScores {
  return {
    A: { round1: 0, round2: 0, round3: 0, total: 0 },
    B: { round1: 0, round2: 0, round3: 0, total: 0 },
  };
}

// Round rule selector — centralised so Round 3 can diverge later.
export function getRoundRules(settings: GameSettings, round: RoundNumber): RoundRules {
  const base = getRoundConfig(settings, round);
  const skips = Number.isFinite(base.skips) ? Math.max(0, Math.floor(Number(base.skips))) : 0;
  if (round === 1) {
    return {
      timer: base.timer,
      skipPolicy: skips >= 999 ? 'unlimited' : 'perRoundLimit',
      skipLimit: skips,
      type: base.type,
    };
  }
  if (round === 2) {
    return { timer: base.timer, skipPolicy: 'oncePerTurn', skipLimit: 1, type: base.type };
  }
  // Round 3 — honour configured skipsRound3. Isolated so rules can change later.
  return {
    timer: base.timer,
    skipPolicy: skips >= 999 ? 'unlimited' : 'perRoundLimit',
    skipLimit: skips,
    type: base.type,
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
      lastDescriberId: null,
      turnState: null,
      currentWordId: null,
      mainBowl: [],
      collectedWords: [],
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
    const idx = this.state.turnOrder.indexOf(id);
    if (idx !== -1) {
      this.state.turnOrder.splice(idx, 1);
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
    this.state.scores = emptyScores();
    this.state.collectedWords = [];
    this.state.lastDescriberId = null;
    this.buildTurnOrder();
    this.resetMainBowlFromAll();

    return {
      firstPlayerId: this.state.turnOrder[this.state.currentTurnIndex],
      turnOrder: [...this.state.turnOrder],
    };
  }

  // --- Turn Order ---
  //
  // Build an order that alternates A/B as much as possible, then pick a random
  // starting position. With even teams, strict alternation is preserved. With
  // uneven teams, there will be exactly one place in the cycle where two
  // same-team players are adjacent — unavoidable by pigeonhole.
  private buildTurnOrder(): void {
    const players = Array.from(this.state.players.values());
    const teamA = players.filter((p) => p.team === 'A');
    const teamB = players.filter((p) => p.team === 'B');
    shuffleInPlace(teamA);
    shuffleInPlace(teamB);

    // Interleave: start with the larger team so the "doubled" position
    // falls at the end rather than the start.
    const [big, small] = teamA.length >= teamB.length ? [teamA, teamB] : [teamB, teamA];
    const order: number[] = [];
    const maxLen = Math.max(big.length, small.length);
    for (let i = 0; i < maxLen; i++) {
      if (big[i]) order.push(big[i].id);
      if (small[i]) order.push(small[i].id);
    }

    this.state.turnOrder = order;
    // Random starting position: any index [0, N). The player at this index
    // becomes "turn ID 1" for this game.
    this.state.currentTurnIndex = order.length > 0
      ? Math.floor(Math.random() * order.length)
      : 0;
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
    for (let i = 0; i < len; i++) {
      this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % len;
      const playerId = this.state.turnOrder[this.state.currentTurnIndex];
      const player = this.state.players.get(playerId);
      if (player?.connected) return playerId;
    }
    this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % len;
    return this.state.turnOrder[this.state.currentTurnIndex];
  }

  // --- Bowl Management ---

  private resetMainBowlFromAll(): void {
    this.state.mainBowl = this.state.words.map((w) => w.id);
    shuffleInPlace(this.state.mainBowl);
  }

  drawWord(): EngineWord | null {
    if (this.state.mainBowl.length === 0) return null;
    const wordId = this.state.mainBowl[0];
    this.state.currentWordId = wordId;
    return this.state.words.find((w) => w.id === wordId) || null;
  }

  markCorrect(): { team: Team; roundNumber: RoundNumber; newScore: number; wordsRemaining: number; collectedCount: number } | null {
    if (this.state.currentWordId === null || !this.state.turnState) return null;
    if (this.state.phase !== 'playing') return null;

    const wordId = this.state.currentWordId;

    // Main bowl → collected bowl
    this.state.mainBowl = this.state.mainBowl.filter((id) => id !== wordId);
    this.state.collectedWords.push(wordId);

    const team = this.state.turnState.team;
    const round = this.state.currentRound;
    const scoreKey = `round${round}` as `round${1 | 2 | 3}`;
    this.state.scores[team][scoreKey]++;
    this.state.scores[team].total++;
    this.state.turnState.wordsCorrect++;

    const newScore = this.state.scores[team][scoreKey];
    this.state.currentWordId = null;

    // Remember who emptied the bowl — they start the next round.
    if (this.state.mainBowl.length === 0) {
      this.state.lastDescriberId = this.state.turnState.playerId;
    }

    return {
      team,
      roundNumber: round,
      newScore,
      wordsRemaining: this.state.mainBowl.length,
      collectedCount: this.state.collectedWords.length,
    };
  }

  markSkip(): { wordsRemaining: number; skipsUsed: number; skipsMax: number; usedSkipThisTurn: boolean } | null {
    if (this.state.currentWordId === null || !this.state.turnState) return null;
    if (this.state.phase !== 'playing') return null;

    const rules = getRoundRules(this.state.settings, this.state.currentRound);

    // Policy check
    if (rules.skipPolicy === 'oncePerTurn' && this.state.turnState.usedSkipThisTurn) return null;
    if (rules.skipPolicy === 'perRoundLimit' && rules.skipLimit <= 0) return null;
    if (rules.skipPolicy === 'perRoundLimit' && this.state.turnState.skipsUsed >= rules.skipLimit) return null;

    // Prevent infinite loop when only one word remains.
    if (this.state.mainBowl.length <= 1) return null;

    // Move word to end of main bowl.
    const wordId = this.state.currentWordId;
    this.state.mainBowl = this.state.mainBowl.filter((id) => id !== wordId);
    this.state.mainBowl.push(wordId);

    this.state.turnState.skipsUsed++;
    this.state.turnState.usedSkipThisTurn = true;
    this.state.currentWordId = null;

    return {
      wordsRemaining: this.state.mainBowl.length,
      skipsUsed: this.state.turnState.skipsUsed,
      skipsMax: rules.skipPolicy === 'unlimited' ? 999 : rules.skipLimit,
      usedSkipThisTurn: this.state.turnState.usedSkipThisTurn,
    };
  }

  isRoundComplete(): boolean {
    return this.state.mainBowl.length === 0;
  }

  // --- Turn Management ---

  startTurn(playerId: number): TurnState & { usedSkipThisTurn: boolean } {
    if (this.state.phase !== 'playing') throw new Error('Cannot start turn: game is not in playing phase');
    const player = this.state.players.get(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const rules = getRoundRules(this.state.settings, this.state.currentRound);
    const skipsMax = rules.skipPolicy === 'unlimited' ? 999 : rules.skipLimit;

    const turnState = {
      playerId,
      playerName: player.name,
      team: player.team,
      timerDuration: rules.timer,
      timerStartedAt: Date.now(),
      skipsUsed: 0,
      skipsMax,
      wordsCorrect: 0,
      usedSkipThisTurn: false,
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
    collectedCount: number;
  } {
    const round = this.state.currentRound;
    const scoreKey = `round${round}` as `round${1 | 2 | 3}`;
    const aScore = this.state.scores.A[scoreKey];
    const bScore = this.state.scores.B[scoreKey];
    const roundWinner: Team | 'tie' = aScore > bScore ? 'A' : bScore > aScore ? 'B' : 'tie';

    this.state.phase = 'round_results';

    const nextRound: RoundNumber | null = round < 3 ? ((round + 1) as RoundNumber) : null;
    const nextStartPlayerId = nextRound !== null ? this.state.lastDescriberId : null;

    return {
      roundNumber: round,
      teamAScore: aScore,
      teamBScore: bScore,
      roundWinner,
      nextRound,
      nextStartPlayerId,
      collectedCount: this.state.collectedWords.length,
    };
  }

  // Advance to the next round — triggered by the finishing player's button click.
  startNextRound(): RoundNumber {
    if (this.state.currentRound >= 3) {
      throw new Error('No next round after round 3');
    }
    const nextRound = (this.state.currentRound + 1) as RoundNumber;
    this.state.currentRound = nextRound;
    this.state.phase = 'playing';

    // Return all collected words to the main bowl, reshuffle, and clear collected.
    this.resetMainBowlFromAll();
    this.state.collectedWords = [];

    // The player who emptied the previous bowl starts this round.
    if (this.state.lastDescriberId !== null) {
      const idx = this.state.turnOrder.indexOf(this.state.lastDescriberId);
      if (idx !== -1) this.state.currentTurnIndex = idx;
    }
    this.state.lastDescriberId = null;

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
    return getRoundRules(this.state.settings, this.state.currentRound).type;
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

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
