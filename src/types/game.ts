// Game phases
export type GamePhase = 'lobby' | 'adding_words' | 'playing' | 'round_results' | 'finished';

// Languages
export type Language = 'en' | 'fa';

// Teams
export type Team = 'A' | 'B';

// Round numbers
export type RoundNumber = 1 | 2 | 3;

// Round types
export type RoundType = 'describe' | 'one_word' | 'mime';

// Word source
export type WordSource = 'database' | 'custom';

// Game settings (set at creation)
export interface GameSettings {
  name: string;
  language: Language;
  maxPlayers: number;
  wordsPerPlayer: number;
  timerRound1: number; // seconds
  timerRound2: number;
  timerRound3: number;
  skipsRound1: number;
  skipsRound2: number;
  skipsRound3: number;
}

// Player
export interface GamePlayer {
  id: number;
  gameId: number;
  playerName: string;
  joinOrder: number;
  team: Team;
  isHost: boolean;
  wordsSubmitted: boolean;
  isConnected: boolean;
  socketId?: string;
}

// Word in the game pool
export interface GameWord {
  id: number;
  gameId: number;
  submittedByPlayerId: number;
  wordText: string;
  sourceWordId?: number | null;
  isCustom: boolean;
}

// Word from the database glossary (for browsing/searching)
export interface DictionaryWord {
  id: number;
  word: string;
  difficulty: 'easy' | 'moderate' | 'hard';
}

// Round state
export interface RoundState {
  roundNumber: RoundNumber;
  roundType: RoundType;
  status: 'pending' | 'active' | 'completed';
  teamAScore: number;
  teamBScore: number;
  wordsRemaining: number;
  wordsTotal: number;
}

// Turn state (active turn info)
export interface TurnState {
  playerId: number;
  playerName: string;
  team: Team;
  timerDuration: number;
  timerStartedAt: number; // timestamp
  skipsUsed: number;
  skipsMax: number;
  wordsCorrect: number;
}

// Team scores across all rounds
export interface TeamScores {
  A: { round1: number; round2: number; round3: number; total: number };
  B: { round1: number; round2: number; round3: number; total: number };
}

// Word progress (who submitted words)
export interface WordProgress {
  playerId: number;
  playerName: string;
  submitted: boolean;
  wordCount: number;
}

// Full client-side game state
export interface GameState {
  code: string;
  phase: GamePhase;
  settings: GameSettings;
  players: GamePlayer[];
  myPlayerId: number | null;
  currentRound: RoundNumber | null;
  currentRoundState: RoundState | null;
  currentTurn: TurnState | null;
  scores: TeamScores;
  wordProgress: WordProgress[];
  turnOrder: number[]; // player IDs in order
}

// ----- Socket Event Payloads -----

// Client -> Server
export interface PlayerJoinPayload {
  gameCode: string;
  playerName: string;
}

export interface PlayerReconnectPayload {
  gameCode: string;
  playerId: number;
}

export interface SubmitWordsPayload {
  gameCode: string;
  playerId: number;
  words: Array<{
    text: string;
    sourceWordId?: number;
    isCustom: boolean;
  }>;
}

export interface HostActionPayload {
  gameCode: string;
}

export interface PlayerTurnActionPayload {
  gameCode: string;
  playerId: number;
}

export interface PlayerWordActionPayload {
  gameCode: string;
  playerId: number;
  wordId: number;
}

// Server -> Client
export interface PlayerJoinedEvent {
  player: GamePlayer;
}

export interface PhaseChangedEvent {
  phase: GamePhase;
  round?: RoundNumber;
}

export interface WordsProgressEvent {
  playerId: number;
  submitted: boolean;
  count: number;
}

export interface TurnStartedEvent {
  playerId: number;
  playerName: string;
  team: Team;
  timerDuration: number;
}

export interface WordForDescriberEvent {
  wordId: number;
  wordText: string;
}

export interface CorrectEvent {
  team: Team;
  newScore: number;
  wordsRemaining: number;
  roundNumber: RoundNumber;
}

export interface SkipEvent {
  wordsRemaining: number;
  skipsUsed: number;
  skipsMax: number;
}

export interface TurnEndedEvent {
  playerId: number;
  wordsCorrect: number;
  wordsSkipped: number;
  nextPlayerId: number | null;
  nextPlayerName: string | null;
}

export interface RoundEndedEvent {
  roundNumber: RoundNumber;
  teamAScore: number;
  teamBScore: number;
  roundWinner: Team | 'tie';
  nextRound: RoundNumber | null;
  nextStartPlayerId: number | null;
}

export interface GameFinishedEvent {
  teamATotal: number;
  teamBTotal: number;
  winner: Team | 'tie';
  roundBreakdown: Array<{
    round: RoundNumber;
    teamAScore: number;
    teamBScore: number;
  }>;
}

export interface GameErrorEvent {
  message: string;
  code?: string;
}

// ----- API Request/Response Types -----

export interface CreateGameRequest {
  settings: GameSettings;
  hostName: string;
}

export interface CreateGameResponse {
  code: string;
  gameId: number;
  playerId: number;
}

export interface JoinGameRequest {
  playerName: string;
}

export interface JoinGameResponse {
  playerId: number;
  team: Team;
  joinOrder: number;
}

export interface GetGameResponse {
  game: {
    code: string;
    name: string;
    language: Language;
    status: GamePhase;
    settings: GameSettings;
  };
  players: GamePlayer[];
}

export interface SubmitWordsRequest {
  playerId: number;
  words: Array<{
    text: string;
    sourceWordId?: number;
    isCustom: boolean;
  }>;
}

export interface SubmitWordsResponse {
  inserted: number;
  duplicatesSkipped: number;
}

export interface SearchWordsRequest {
  search?: string;
  difficulty?: 'easy' | 'moderate' | 'hard';
  count?: number;
}

export interface SearchWordsResponse {
  words: DictionaryWord[];
}

// Helper to get round config from settings
export function getRoundConfig(settings: GameSettings, round: RoundNumber): { timer: number; skips: number; type: RoundType } {
  const configs: Record<RoundNumber, { timer: number; skips: number; type: RoundType }> = {
    1: { timer: settings.timerRound1, skips: settings.skipsRound1, type: 'describe' },
    2: { timer: settings.timerRound2, skips: settings.skipsRound2, type: 'one_word' },
    3: { timer: settings.timerRound3, skips: settings.skipsRound3, type: 'mime' },
  };
  return configs[round];
}

// Helper to determine team from join order
export function getTeamFromJoinOrder(joinOrder: number): Team {
  return joinOrder % 2 === 1 ? 'A' : 'B';
}
