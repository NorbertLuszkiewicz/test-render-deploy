import { ParticipantDto } from "twisted/dist/models-dto";

export type Server = "EUW" | "EUNE" | "KR" | "NA";
export interface Participant extends ParticipantDto {
  augments?: string[];
}

export interface Summoner {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
  gameName: string;
  tagLine: string;
}
