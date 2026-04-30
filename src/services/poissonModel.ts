import { PredictionResults, TeamStats } from '../types';

function factorial(n: number): number {
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poissonProbability(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

export function calculatePrediction(
  homeStats: TeamStats,
  awayStats: TeamStats,
  maxScore: number = 7
): PredictionResults {
  const HOME_ADVANTAGE = 1.15;

  let xgHome = homeStats.avgGoalsScored * awayStats.avgGoalsConceded * HOME_ADVANTAGE;
  let xgAway = awayStats.avgGoalsScored * homeStats.avgGoalsConceded;

  // Clamp values
  xgHome = Math.max(0.1, Math.min(xgHome, 6.0));
  xgAway = Math.max(0.1, Math.min(xgAway, 6.0));

  const matrix: number[][] = [];
  for (let h = 0; h <= maxScore; h++) {
    matrix[h] = [];
    for (let a = 0; a <= maxScore; a++) {
      matrix[h][a] = poissonProbability(xgHome, h) * poissonProbability(xgAway, a);
    }
  }

  // 1X2 Probabilities
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h <= maxScore; h++) {
    for (let a = 0; a <= maxScore; a++) {
      if (h > a) homeWin += matrix[h][a];
      else if (h === a) draw += matrix[h][a];
      else awayWin += matrix[h][a];
    }
  }

  // Over/Under
  const overUnder: { [key: string]: { over: number; under: number } } = {};
  const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5];

  thresholds.forEach((t) => {
    let pOver = 0;
    for (let h = 0; h <= maxScore; h++) {
      for (let a = 0; a <= maxScore; a++) {
        if (h + a > t) pOver += matrix[h][a];
      }
    }
    overUnder[t.toString()] = {
      over: Math.round(pOver * 1000) / 10,
      under: Math.round((1 - pOver) * 1000) / 10,
    };
  });

  // Top Scores
  const flatScores: Array<{ home: number; away: number; probability: number }> = [];
  for (let h = 0; h <= maxScore; h++) {
    for (let a = 0; a <= maxScore; a++) {
      flatScores.push({
        home: h,
        away: a,
        probability: Math.round(matrix[h][a] * 1000) / 10,
      });
    }
  }
  const topScores = flatScores
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);

  return {
    homeTeam: homeStats.team,
    awayTeam: awayStats.team,
    xgHome: Math.round(xgHome * 100) / 100,
    xgAway: Math.round(xgAway * 100) / 100,
    probabilities1X2: {
      homeWin: Math.round(homeWin * 1000) / 10,
      draw: Math.round(draw * 1000) / 10,
      awayWin: Math.round(awayWin * 1000) / 10,
    },
    overUnder,
    topScores,
  };
}
