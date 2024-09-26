import { Summoner } from "../types/riot";

export const serverNameToServerId = {
  EUW: "EUW1",
  EUNE: "EUN1",
  NA: "NA1",
  KR: "KR",
};

export const lolPosition = {
  TOP: "TOP",
  JUNGLE: "JG",
  MIDDLE: "MID",
  BOTTOM: "ADC",
  SUPPORT: "SUP",
  UTILITY: "SUP",
};

export const spotifyScopes = [
  "ugc-image-upload",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "app-remote-control",
  "user-read-email",
  "user-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-read-private",
  "playlist-modify-private",
  "user-library-modify",
  "user-library-read",
  "user-top-read",
  "user-read-playback-position",
  "user-read-recently-played",
  "user-follow-read",
  "user-follow-modify",
];

export const region = {
  EUW1: "EUROPE",
  EUN1: "EUROPE",
  NA1: "AMERICAS",
  KR: "ASIA",
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const plToEnAlphabet = (text: string): string => {
  return text
    .replace(/ą/g, "a")
    .replace(/Ą/g, "A")
    .replace(/ć/g, "c")
    .replace(/Ć/g, "C")
    .replace(/ę/g, "e")
    .replace(/Ę/g, "E")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/ń/g, "n")
    .replace(/Ń/g, "N")
    .replace(/ó/g, "o")
    .replace(/Ó/g, "O")
    .replace(/ś/g, "s")
    .replace(/Ś/g, "S")
    .replace(/ż/g, "z")
    .replace(/Ż/g, "Z")
    .replace(/ź/g, "z")
    .replace(/Ź/g, "Z");
};

export const changeBadWords = (message: string): string => {
  const correctMessage = message
    .toLowerCase()
    .replace(/nigger/g, "ni**er")
    .replace(/niga/g, "n**a")
    .replace(/nigga/g, "n***a")
    .replace(/czarnuch/g, "cz***uch")
    .replace(/cwel/g, "c++l")
    .replace("nigger", "ni**er")
    .replace("niga", "n**a")
    .replace("nigga", "n***a")
    .replace("czarnuch", "cz***uch")
    .replace("cwel", "c++l");

  return correctMessage == message.toLowerCase() ? message : correctMessage;
};

export const getByRiotName = async (fullName: string, server, api, apiRiot): Promise<Summoner> => {
  try {
    const serverAsRegion: any = region[server];
    const [name, tagLine = server] = fullName.split("#");
    const userCredentials = await apiRiot.Account.getByRiotId(name, tagLine, serverAsRegion);
    const summoner = await api.Summoner.getByPUUID(userCredentials?.response?.puuid, server);
    const data = { ...summoner?.response, ...userCredentials?.response };

    return data;
  } catch (err) {
    console.log(err);
  }
};
