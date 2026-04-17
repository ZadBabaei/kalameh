'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  GameState,
  GamePlayer,
  GamePhase,
  RoundNumber,
  TurnState,
  RoundState,
  TeamScores,
  WordProgress,
  CorrectEvent,
  SkipEvent,
  TurnEndedEvent,
  RoundEndedEvent,
  GameFinishedEvent,
  TurnStartedEvent,
  PhaseChangedEvent,
  WordsProgressEvent,
} from '@/types/game';

// ----- Action types -----

type GameAction =
  | { type: 'FULL_STATE'; payload: GameState }
  | { type: 'PLAYER_JOINED'; payload: GamePlayer }
  | { type: 'PLAYER_DISCONNECTED'; payload: { playerId: number } }
  | { type: 'PLAYER_RECONNECTED'; payload: { playerId: number } }
  | { type: 'PHASE_CHANGED'; payload: PhaseChangedEvent }
  | { type: 'WORDS_PROGRESS'; payload: WordsProgressEvent }
  | { type: 'TURN_STARTED'; payload: TurnStartedEvent & { timerStartedAt: number } }
  | { type: 'CORRECT'; payload: CorrectEvent }
  | { type: 'SKIP'; payload: SkipEvent }
  | { type: 'TURN_ENDED'; payload: TurnEndedEvent }
  | { type: 'ROUND_ENDED'; payload: RoundEndedEvent }
  | { type: 'GAME_FINISHED'; payload: GameFinishedEvent }
  | { type: 'SET_MY_PLAYER_ID'; payload: { playerId: number } };

// ----- Initial state -----

const initialScores: TeamScores = {
  A: { round1: 0, round2: 0, round3: 0, total: 0 },
  B: { round1: 0, round2: 0, round3: 0, total: 0 },
};

const initialState: GameState = {
  code: '',
  phase: 'lobby',
  settings: {
    name: '',
    language: 'en',
    maxPlayers: 8,
    wordsPerPlayer: 5,
    timerRound1: 60,
    timerRound2: 45,
    timerRound3: 30,
    skipsRound1: 3,
    skipsRound2: 2,
    skipsRound3: 1,
  },
  players: [],
  myPlayerId: null,
  currentRound: null,
  currentRoundState: null,
  currentTurn: null,
  scores: initialScores,
  wordProgress: [],
  turnOrder: [],
};

// ----- Reducer -----

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'FULL_STATE':
      return { ...action.payload };

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: [...state.players, action.payload],
      };

    case 'PLAYER_DISCONNECTED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload.playerId ? { ...p, isConnected: false } : p,
        ),
      };

    case 'PLAYER_RECONNECTED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload.playerId ? { ...p, isConnected: true } : p,
        ),
      };

    case 'PHASE_CHANGED': {
      const { phase, round } = action.payload;
      return {
        ...state,
        phase: phase as GamePhase,
        currentRound: round !== undefined ? (round as RoundNumber) : state.currentRound,
      };
    }

    case 'WORDS_PROGRESS': {
      const { playerId, submitted, count } = action.payload;
      const existing = state.wordProgress.find((wp) => wp.playerId === playerId);
      if (existing) {
        return {
          ...state,
          wordProgress: state.wordProgress.map((wp) =>
            wp.playerId === playerId ? { ...wp, submitted, wordCount: count } : wp,
          ),
        };
      }
      const player = state.players.find((p) => p.id === playerId);
      const newEntry: WordProgress = {
        playerId,
        playerName: player?.playerName ?? '',
        submitted,
        wordCount: count,
      };
      return { ...state, wordProgress: [...state.wordProgress, newEntry] };
    }

    case 'TURN_STARTED': {
      const { playerId, playerName, team, timerDuration, timerStartedAt } = action.payload;
      const turn: TurnState = {
        playerId,
        playerName,
        team,
        timerDuration,
        timerStartedAt,
        skipsUsed: 0,
        skipsMax: state.currentRoundState?.wordsRemaining ?? 0,
        wordsCorrect: 0,
      };
      return { ...state, currentTurn: turn };
    }

    case 'CORRECT': {
      const { team, newScore, wordsRemaining, roundNumber } = action.payload;
      const roundKey = `round${roundNumber}` as 'round1' | 'round2' | 'round3';
      const updatedScores: TeamScores = {
        ...state.scores,
        [team]: {
          ...state.scores[team],
          [roundKey]: newScore,
          total: state.scores[team].total + 1,
        },
      };
      const updatedRoundState: RoundState | null = state.currentRoundState
        ? { ...state.currentRoundState, wordsRemaining }
        : null;
      const updatedTurn: TurnState | null = state.currentTurn
        ? { ...state.currentTurn, wordsCorrect: state.currentTurn.wordsCorrect + 1 }
        : null;
      return {
        ...state,
        scores: updatedScores,
        currentRoundState: updatedRoundState,
        currentTurn: updatedTurn,
      };
    }

    case 'SKIP': {
      const { skipsUsed } = action.payload;
      const updatedTurn: TurnState | null = state.currentTurn
        ? { ...state.currentTurn, skipsUsed }
        : null;
      return { ...state, currentTurn: updatedTurn };
    }

    case 'TURN_ENDED': {
      const { nextPlayerId } = action.payload;
      return {
        ...state,
        currentTurn: null,
        // Rotate turnOrder so next player is at the front if known
        turnOrder:
          nextPlayerId !== null
            ? [
                nextPlayerId,
                ...state.turnOrder.filter((id) => id !== nextPlayerId),
              ]
            : state.turnOrder,
      };
    }

    case 'ROUND_ENDED': {
      const { roundNumber, teamAScore, teamBScore, nextRound } = action.payload;
      const roundKey = `round${roundNumber}` as 'round1' | 'round2' | 'round3';
      const updatedScores: TeamScores = {
        A: {
          ...state.scores.A,
          [roundKey]: teamAScore,
          total: state.scores.A.total,
        },
        B: {
          ...state.scores.B,
          [roundKey]: teamBScore,
          total: state.scores.B.total,
        },
      };
      return {
        ...state,
        scores: updatedScores,
        currentRound: nextRound,
        currentTurn: null,
        phase: nextRound !== null ? 'round_results' : state.phase,
      };
    }

    case 'GAME_FINISHED': {
      const { teamATotal, teamBTotal, roundBreakdown } = action.payload;
      const updatedScores: TeamScores = {
        A: {
          round1: roundBreakdown.find((r) => r.round === 1)?.teamAScore ?? state.scores.A.round1,
          round2: roundBreakdown.find((r) => r.round === 2)?.teamAScore ?? state.scores.A.round2,
          round3: roundBreakdown.find((r) => r.round === 3)?.teamAScore ?? state.scores.A.round3,
          total: teamATotal,
        },
        B: {
          round1: roundBreakdown.find((r) => r.round === 1)?.teamBScore ?? state.scores.B.round1,
          round2: roundBreakdown.find((r) => r.round === 2)?.teamBScore ?? state.scores.B.round2,
          round3: roundBreakdown.find((r) => r.round === 3)?.teamBScore ?? state.scores.B.round3,
          total: teamBTotal,
        },
      };
      return {
        ...state,
        phase: 'finished',
        scores: updatedScores,
        currentTurn: null,
      };
    }

    case 'SET_MY_PLAYER_ID':
      return { ...state, myPlayerId: action.payload.playerId };

    default:
      return state;
  }
}

// ----- Context -----

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}

export type { GameAction };
