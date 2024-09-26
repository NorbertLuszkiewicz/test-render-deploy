import axios from "axios";
import { TftApi, LolApi, RiotApi } from "twisted";
import { MatchV5DTOs } from "twisted/dist/models-dto";
import { updateRiot, getRiot, getAllRiot } from "../../controllers/RiotController";
import { getByRiotName, lolPosition, region, serverNameToServerId } from "../../helpers";

const api = new TftApi();
const apiRiot = new RiotApi({ key: process.env.RIOT_API_KEY_LOL });
const apiLol = new LolApi({
  key: process.env.RIOT_API_KEY_LOL,
});
let LOL_ITEMS;
let LOL_CHAMPIONS;

const convertChampionIdToName = (id: string): string => {
  const champions = LOL_CHAMPIONS.data;
  for (const name in champions) {
    if (id == champions[name].key) return name;
  }
};

const getMatchText = (data, puuid: string): string => {
  const me = data.participants.filter(x => x.puuid === puuid)[0];
  const myTeam = data.participants.filter(x => x.teamId === me.teamId);
  const myTeamWithoutMe = myTeam.filter(x => x.puuid !== puuid);
  const myTeamStats = myTeamWithoutMe.map(m => {
    return {
      accountName: m.riotIdGameName,
      position: lolPosition[m?.teamPosition],
      totalDamageDealtToChampions: m?.totalDamageDealtToChampions,
      championName: m?.championName,
      stats: `(${m?.kills},${m?.deaths},${m?.assists})`,
    };
  });

  const isWin = me?.win ? "WIN" : "LOSE";
  const gameEndTimestamp = data.gameEndTimestamp ? `| ${new Date(data.gameEndTimestamp).toLocaleString()}` : "";
  const position = lolPosition[me?.teamPosition];
  const totalDamageDealtToChampions = me?.totalDamageDealtToChampions;
  const championName = me?.championName;
  const totalTeamDamage = myTeam.reduce((prev, curr) => prev + curr.totalDamageDealtToChampions, 0);
  const teamDamagePercentage = ((totalDamageDealtToChampions / totalTeamDamage) * 100).toFixed(0);
  const stats = `(${me?.kills},${me?.deaths},${me?.assists})`;
  const itemIdList = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5].filter(x => x);
  const itemList = itemIdList.map(item => LOL_ITEMS.data[item].name).filter(x => x);
  // [WIN] MID | Sylas(20,5,3) | 40181dmg(28%)
  let message = `[${isWin}] ${position} | ${championName}${stats} | ${totalDamageDealtToChampions}dmg(${teamDamagePercentage}%) | trwała ${Math.ceil(
    data.gameDuration / 60
  )}min ${gameEndTimestamp}`;
  message += ` ___________________________________________________ `;
  message += ` [${itemList.join(" | ")}]`;
  message += ` ___________________________________________________ `;
  message += myTeamStats
    .map(stats => {
      return `[${stats.accountName}]${stats.position}|${stats.championName}${stats.stats}|dmg(${(
        (stats.totalDamageDealtToChampions / totalTeamDamage) *
        100
      ).toFixed(0)}%)`;
    })
    .join(", ");

  return message;
};

const getMatchListText = (todayMatchList, puuid: string): string => {
  //   1. [WIN]MID|VEX(12,4,5)-20212dmg(30%)...
  let matchListTwitch = `dzisiejsze gierki: `;

  todayMatchList.forEach((match, index) => {
    let personNrInTeam = 0;
    let teamDemageAll = 0;
    const myBoard = match.participants.find(item => {
      personNrInTeam = personNrInTeam + 1;
      return item.puuid === puuid;
    });
    match.participants.forEach((x, xIndex) => {
      if (personNrInTeam < 6 && xIndex < 5) {
        teamDemageAll = teamDemageAll + x.totalDamageDealtToChampions;
      } else if (personNrInTeam >= 6 && xIndex >= 5) {
        teamDemageAll = teamDemageAll + x.totalDamageDealtToChampions;
      }
    });

    const isWin = myBoard.win ? "WIN" : "LOSE";
    const position = lolPosition[myBoard.teamPosition];
    const totalDamageDealtToChampions = myBoard.totalDamageDealtToChampions;
    const teamDamagePercentage = ((totalDamageDealtToChampions / teamDemageAll) * 100).toFixed(0);
    const championName = myBoard.championName;
    const stats = `(${myBoard.kills},${myBoard.deaths},${myBoard.assists})`;

    matchListTwitch = `${matchListTwitch} ${
      index + 1
    }[${isWin}]${position}|${championName}${stats}|${totalDamageDealtToChampions}dmg(${teamDamagePercentage}%)`;
  });
  return matchListTwitch;
};

const getMatchList = async (data, nickname: string, server: string): Promise<{ puuid: string; matchIdList: any[] }> => {
  let puuid = "";
  let matchIdList = [];
  try {
    if (nickname) {
      const summoner = await getByRiotName(nickname, server ? serverNameToServerId[server] : "EUW1", apiLol, apiRiot);

      matchIdList = (
        await apiLol.MatchV5.list(summoner.puuid, server ? region[serverNameToServerId[server]] : "EUROPE", {
          count: 10,
        })
      ).response;
      puuid = summoner.puuid;
    } else {
      const summoner = await getByRiotName(
        data.activeRiotAccount?.name,
        data.activeRiotAccount?.server ? data.activeRiotAccount.server : "EUW1",
        apiLol,
        apiRiot
      );

      matchIdList = (await apiLol.MatchV5.list(summoner.puuid, region[data.activeRiotAccount.server], { count: 10 }))
        .response;

      puuid = summoner.puuid;
    }

    return { puuid, matchIdList };
  } catch (err) {
    console.log("Error while getting lol matches" + err);
  }
};

const getLolUserStatsText = (name: string, userInfo, mastery): string => {
  const masteryToText = mastery
    .map(m => `${convertChampionIdToName(m.championId)} (${m.championPoints.toLocaleString()} pkt)`)
    .filter(x => x)
    .join(" | ");
  const wins = userInfo?.wins || 0;
  const losses = userInfo?.losses || 0;

  const wr = ((wins / (wins + losses)) * 100).toFixed(1);
  return `statystyki LOL dla gracza: ${name} | ${userInfo?.tier}${"-" + userInfo?.rank} ${userInfo.leaguePoints}LP ${
    userInfo.wins
  }wins ${wins + losses}games ( ${wr}% wr) | Mastery (${masteryToText})`;
};

export const getLolMatchStats = async (streamer: string, nickname: string, server: string): Promise<string> => {
  const [data] = await getRiot(streamer);
  let matchList = [];
  try {
    const { puuid, matchIdList } = await getMatchList(data, nickname, server);
    const regionName = server ? region[serverNameToServerId[server]] : region[data.activeRiotAccount?.server];

    matchList = matchIdList.map(async id => {
      return (await apiLol.MatchV5.get(id, regionName))?.response?.info;
    });

    return Promise.all(matchList).then(matchList => {
      const now = new Date();
      const today = Date.parse(`${now.getMonth() + 1}, ${now.getDate()}, ${now.getFullYear()} UTC`);

      const todayMatchList = matchList.filter(match => {
        if (match.gameEndTimestamp > today) {
          return match;
        }
      });

      if (todayMatchList.length > 0) {
        //   1. [WIN]MID|VEX(12,4,5)-20212dmg(30%)|[duo] ...
        const matchListAnswer = getMatchListText(todayMatchList, puuid);
        return matchListAnswer;
      } else {
        return `${nickname ? nickname : streamer} nie zagrał dzisiaj żadnej gry`;
      }
    });
  } catch (err) {
    console.log("Error while getting lol matches stats" + err);
    const message = `Nie znaleziono meczy LOL z dzisiaj dla ${
      nickname ? nickname + "#" + (server || "EUW") : `streamera`
    }`;
    return message;
  }
};

export const getLolUserStats = async (streamer: string, nickname: string, server: string): Promise<string> => {
  const [data] = await getRiot(streamer);
  const lolRegion = server ? serverNameToServerId[server] : "EUW1";
  let puuid = data.activeRiotAccount.lol_puuid;
  let message = "";

  try {
    if (nickname) {
      const summoner = await getByRiotName(nickname, lolRegion, apiLol, apiRiot);
      const userData = await apiLol.League.bySummoner(summoner.id, lolRegion);
      const userInfo = userData.response.filter(x => x.queueType === "RANKED_SOLO_5x5")[0];

      puuid = summoner.puuid;
      const userDetails = await axios.get(
        `https://${lolRegion}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}?api_key=${process.env.RIOT_API_KEY_LOL}`
      );

      message = getLolUserStatsText(summoner.gameName, userInfo, userDetails?.data.slice(0, 3));
    } else {
      const server: any = data.activeRiotAccount.server;
      const userData = await apiLol.League.bySummoner(data.activeRiotAccount.lol_id, server);
      const userInfo = userData.response.filter(x => x.queueType === "RANKED_SOLO_5x5")[0];

      const userDetails = await axios.get(
        `https://${lolRegion}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}?api_key=${process.env.RIOT_API_KEY_LOL}`
      );

      message = getLolUserStatsText(data.activeRiotAccount.name, userInfo, userDetails?.data?.slice(0, 3));
    }
    return message;
  } catch (err) {
    console.log("Error while getting lol user stats" + err);
    message = `Nie znaleziono statystyk LOL dla ${nickname ? nickname + "#" + (server || "EUW") : `streamera`}`;
    return message;
  }
};

export const getLolMatch = async (
  number: number,
  nickname: string,
  server: string,
  streamer: string
): Promise<string> => {
  let message = "";

  if (!number) {
    return "@${user} komenda !mecze pokazuje liste meczy z dzisiaj (miejsca o raz synergie) !mecz [nr] gdzie [nr] oznacza numer meczu licząc od najnowszego czyli !mecz 1 pokaze ostatnią gre (wyświetla dokładny com z itemami i synergiami)";
  }
  try {
    const [data] = await getRiot(streamer);
    let puuid = data.activeRiotAccount.lol_puuid;
    let gameRegion = nickname ? "EUROPE" : region[data.activeRiotAccount.server];

    if (nickname) {
      const summoner = await getByRiotName(nickname, server ? serverNameToServerId[server] : "EUW1", apiLol, apiRiot);
      gameRegion = server ? region[serverNameToServerId[server]] : "EUROPE";
      puuid = summoner.puuid;
    }
    const matchList = await apiLol.MatchV5.list(puuid, gameRegion, { count: number });
    const matchDetails = await apiLol.MatchV5.get(matchList.response.at(-1), gameRegion);

    return getMatchText(matchDetails?.response?.info, puuid);
  } catch (err) {
    console.log("Error while getting lol user match" + err);
    message = `Nie znaleziono meczu LOL dla ${nickname ? nickname + "#" + (server || "EUW") : `streamera`}`;
    return message;
  }
};

export const updateRiotItemsAndChampions = async (): Promise<void> => {
  const lolItems = await axios.get("https://ddragon.leagueoflegends.com/cdn/14.2.1/data/en_US/item.json");
  const lolChampionss = await axios.get("https://ddragon.leagueoflegends.com/cdn/14.2.1/data/en_US/champion.json");
  LOL_ITEMS = lolItems.data;
  LOL_CHAMPIONS = lolChampionss.data;
};

export const checkActiveRiotAccount = async (): Promise<void> => {
  try {
    const streamers = await getAllRiot();
    streamers.forEach(async streamer => {
      if (streamer.riotAccountList && streamer.riotAccountList.length > 0) {
        streamer.riotAccountList.forEach(async ({ puuid, server, name, id, lol_puuid, lol_id }) => {
          const lastMatch = await api.Match.listWithDetails(puuid, region[server], { count: 1 });
          let lastMatchLol;

          if (lol_puuid) {
            const lastMatchLolId = (
              await apiLol.MatchV5.list(lol_puuid, region[server], {
                count: 1,
              })
            ).response;
            const OUTDATED_MATCH_ID = "EUW1_5273890293";
            if (
              lastMatchLolId.length > 0 &&
              lastMatchLolId[0] !== OUTDATED_MATCH_ID &&
              lastMatchLolId[0] !== "EUN1_3252759263"
            ) {
              lastMatchLol = (await apiLol.MatchV5.get(lastMatchLolId[0], region[server]))?.response || "";
            }
          }
          const isLol = lastMatchLol?.info?.gameEndTimestamp > lastMatch[0]?.info?.game_datetime;
          if (
            lastMatch[0]?.info?.game_datetime > (streamer.activeRiotAccount ? streamer.activeRiotAccount.date : 0) ||
            lastMatchLol?.info?.gameEndTimestamp > (streamer.activeRiotAccount ? streamer.activeRiotAccount.date : 0)
          ) {
            await updateRiot({
              streamer: streamer.streamer,
              activeRiotAccount: {
                name,
                server,
                puuid,
                id,
                lol_puuid,
                lol_id,
                isLol,
                date: isLol ? lastMatchLol?.info?.gameEndTimestamp : lastMatch[0]?.info?.game_datetime || "",
              },
            });
          }
        });
      }
    });
  } catch ({ response }) {
    console.log(`Error while resetting active riot account (${response.status} ${response.statusText})`);
  }
};
