export interface TeamStats {
  team: string;
  matchesAnalyzed: number;
  totalGoalsScored: number;
  avgGoalsScored: number;
  totalGoalsConceded: number;
  avgGoalsConceded: number;
}

export interface PredictionResults {
  homeTeam: string;
  awayTeam: string;
  xgHome: number;
  xgAway: number;
  probabilities1X2: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  overUnder: {
    [key: string]: {
      over: number;
      under: number;
    };
  };
  topScores: Array<{
    home: number;
    away: number;
    probability: number;
  }>;
}

export interface HistoryItem {
  id: string;
  results: PredictionResults;
  teamStats: { home: TeamStats; away: TeamStats };
  timestamp: number;
}
