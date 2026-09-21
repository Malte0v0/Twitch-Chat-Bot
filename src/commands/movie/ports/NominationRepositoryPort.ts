import type { Movie } from "../Movie.js";

export interface NominationRepositoryPort {
  userNominatedThisWeek(userId: number): boolean;
  saveNomination(userId: number, omdbId: string): void;
  getWeeklyNominations(weekNum: number): Movie[];
  deleteNomination(userId: number, weekNum: number): void;
}
