import { GoogleGenAI, Type } from "@google/genai";
import { TeamStats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const teamStatsSchema = {
  type: Type.OBJECT,
  properties: {
    team: { type: Type.STRING, description: "Official name of the team" },
    matchesAnalyzed: { type: Type.NUMBER, description: "Number of recent matches analyzed (usually 10)" },
    totalGoalsScored: { type: Type.NUMBER, description: "Total goals scored in these matches" },
    avgGoalsScored: { type: Type.NUMBER, description: "Average goals scored per match" },
    totalGoalsConceded: { type: Type.NUMBER, description: "Total goals conceded in these matches" },
    avgGoalsConceded: { type: Type.NUMBER, description: "Average goals conceded per match" },
  },
  required: ["team", "matchesAnalyzed", "totalGoalsScored", "avgGoalsScored", "totalGoalsConceded", "avgGoalsConceded"],
};

export async function fetchTeamStats(teamName: string): Promise<TeamStats> {
  const prompt = `Fetch the recent football statistics for the team: "${teamName}". 
  Provide the average goals scored and conceded over the last 10 competitive matches. 
  If current season data is available, prioritize it. 
  Be as accurate as possible for the current year 2024-2026.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: teamStatsSchema,
    },
  });

  const stats = JSON.parse(response.text || "{}");
  return stats as TeamStats;
}

export async function fetchMatchStats(homeTeam: string, awayTeam: string): Promise<{ home: TeamStats; away: TeamStats }> {
  const prompt = `Fetch recent football statistics for a match between "${homeTeam}" and "${awayTeam}". 
  Provide statistics for BOTH teams separately based on their last 10 competitive matches.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          home: teamStatsSchema,
          away: teamStatsSchema,
        },
        required: ["home", "away"],
      },
    },
  });

  const data = JSON.parse(response.text || "{}");
  return data as { home: TeamStats; away: TeamStats };
}
