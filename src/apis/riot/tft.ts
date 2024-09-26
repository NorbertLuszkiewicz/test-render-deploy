import { TftApi, LolApi, RiotApi } from "twisted";
import { Regions } from "twisted/dist/constants";
import { MatchTFTDTO, TraitDto } from "twisted/dist/models-dto";

import { updateRiot, getRiot } from "../../controllers/RiotController";
import { Participant, Summoner } from "../../types/riot";
import { getByRiotName, region, serverNameToServerId } from "../../helpers";

const api = new TftApi();
const apiRiot = new RiotApi();
const apiLol = new LolApi({
  key: process.env.RIOT_API_KEY_LOL,
});

const getTftUserStatsText = (name: string, userInfo): string => {
  return `statystyki TFT dla gracza: ${name} | ${userInfo.tier}-${userInfo.rank} ${userInfo.leaguePoints}LP ${
    userInfo.wins
  }wins ${userInfo.wins + userInfo.losses}games`;
};

const getUserNameFromSummonerId = async (summonerId: string, server: Regions): Promise<string> => {
  const serverAsRegion: any = region[server];
  const summoner = await api.Summoner.getById(summonerId, server);
  const user = await apiRiot.Account.getByPUUID(summoner?.response?.puuid, serverAsRegion);

  return user?.response?.gameName;
};

const getSortedTftMatchData = (traits: TraitDto[], units) => {
  const sortedTraits = traits.filter(trait => trait.tier_current > 0).sort((a, b) => b.num_units - a.num_units);
  const sortedUnits = units
    .sort((a, b) => b.rarity - a.rarity)
    .sort((a, b) => b.tier - a.tier)
    .sort((a, b) => b.itemNames?.length - a.itemNames?.length);

  return { sortedTraits, sortedUnits };
};

const createTftMatchText = (placement: number, level: number, augments: string[], sortedTraits, sortedUnits) => {
  let message = `[Top${placement}] Level: ${level} | `;

  sortedTraits.forEach(trait => {
    const traitNameWithoutSet = trait.name.substr(trait.name.lastIndexOf("_") + 1);
    message = message + `${traitNameWithoutSet}*${trait.num_units}, `;
  });
  message = message + `| ${augments} `;
  message = message + "___________________________________________________";

  sortedUnits.forEach(unit => {
    let itemList: string = "";

    if (unit.itemNames.length > 0) {
      const items = unit.itemNames
        .map(item => {
          const itemNameWithoutSet = item.substr(item.lastIndexOf("_") + 1);
          const UpperLetters = itemNameWithoutSet.replace(/[a-z]/g, "");
          const result = UpperLetters.length > 1 ? UpperLetters : itemNameWithoutSet.trim().substring(0, 5);
          return result;
        })
        .filter(x => x);
      itemList = `[${items}]`;
    }

    const augmentNameWithoutSet = unit.character_id.substr(unit.character_id.lastIndexOf("_") + 1);
    message = message + `${unit.tier}*${augmentNameWithoutSet}${itemList}, `;
  });

  return message;
};

export const resetRiotName = async (streamer: string): Promise<void> => {
  const [data] = await getRiot(streamer);
  const riotAccountList = data.riotAccountList;

  const newRiotAccountList = await Promise.all(
    riotAccountList.map(async account => {
      const { response } = await api.Summoner.getByPUUID(account.puuid, account.server);
      return {
        ...account,
        name: response.name,
      };
    })
  );
  await updateRiot({
    streamer: data.streamer,
    riotAccountList: newRiotAccountList,
  });
};

export const addTftUser = async (name: string, server: Regions, streamer: string): Promise<void> => {
  const [data] = await getRiot(streamer);

  const existThisAccount = data.riotAccountList.find(
    riotAccount => riotAccount.name === name && riotAccount.server === server
  );

  if (!existThisAccount) {
    const summoner = await getByRiotName(name, server, api, apiRiot);
    const summonerLol = await getByRiotName(name, server, apiLol, apiRiot);

    const newRiotAccountList = data.riotAccountList
      ? [
          ...data.riotAccountList,
          {
            name,
            server,
            puuid: summoner.puuid,
            id: summoner.id,
            lol_puuid: summonerLol.puuid,
            lol_id: summonerLol.id,
          },
        ]
      : [
          {
            name,
            server,
            puuid: summoner.puuid,
            id: summoner.id,
            lol_puuid: summonerLol.puuid,
            lol_id: summonerLol.id,
          },
        ];

    await updateRiot({
      streamer,
      riotAccountList: newRiotAccountList,
    });
  }
};

export const removeTftUser = async (name: string, server: string, streamer: string): Promise<void> => {
  const [data] = await getRiot(streamer);

  const accounts = data.riotAccountList.filter(
    riotAccount => !(riotAccount.name === name && riotAccount.server === server)
  );

  await updateRiot({
    streamer,
    riotAccountList: accounts,
  });
};

export const tftMatchList = async (streamer: string, nickname: string, server: string): Promise<string> => {
  const [data] = await getRiot(streamer);
  let matchList: MatchTFTDTO[];
  let puuid = "";
  try {
    if (nickname) {
      const summoner = await getByRiotName(nickname, server ? serverNameToServerId[server] : "EUW1", api, apiRiot);

      matchList = await api.Match.listWithDetails(
        summoner.puuid,
        server ? region[serverNameToServerId[server]] : "EUROPE",
        { count: 10 }
      );
      puuid = summoner.puuid;
    } else {
      matchList = await api.Match.listWithDetails(data.activeRiotAccount.puuid, region[data.activeRiotAccount.server], {
        count: 10,
      });
      puuid = data.activeRiotAccount.puuid;
    }

    const now = new Date();
    const today = Date.parse(`${now.getMonth() + 1}, ${now.getDate()}, ${now.getFullYear()} UTC`);
    const todayMatchList = matchList.filter(match => {
      if (match.info.game_datetime > today) {
        return match;
      }
    });

    if (todayMatchList.length > 0) {
      let matchListTwitch = `dzisiejsze gierki: `;

      todayMatchList.forEach((match, index) => {
        const myBoard = match.info.participants.find(item => {
          return item.puuid === puuid;
        });

        const traits = myBoard.traits.sort((a, b) => b.num_units - a.num_units);

        matchListTwitch =
          matchListTwitch +
          `${index + 1}[Top${myBoard.placement}]${traits[0].num_units}${traits[0].name.substr(5)}|${
            traits[1].num_units
          }${traits[1].name.substr(5)}|${traits[2].num_units}${traits[2].name.substr(5)} `;
      });

      return matchListTwitch;
    }

    return `${nickname ? nickname : streamer} nie zagrał dzisiaj żadnej gry w TFT`;
  } catch (err) {
    console.log("Error while getting tft matches stats" + err);
    const message = `Nie znaleziono meczy TFT z dzisiaj dla ${
      nickname ? nickname + "#" + (server || "EUW") : `streamera`
    }`;
    return message;
  }
};

export const getMatch = async (number: number, nickname: string, server: string, streamer: string): Promise<string> => {
  if (!number) {
    return "@${user} komenda !mecze pokazuje liste meczy z dzisiaj (miejsca o raz synergie) !mecz [nr] gdzie [nr] oznacza numer meczu licząc od najnowszego czyli !mecz 1 pokaze ostatnią gre (wyświetla dokładny com z itemami i synergiami)";
  }
  try {
    const [data] = await getRiot(streamer);
    let puuid = data.activeRiotAccount.puuid;
    let gameRegion = nickname ? "EUROPE" : region[data.activeRiotAccount.server];

    if (nickname) {
      const summoner = await getByRiotName(nickname, server ? serverNameToServerId[server] : "EUW1", api, apiRiot);
      gameRegion = server ? region[serverNameToServerId[server]] : "EUROPE";
      puuid = summoner.puuid;
    }

    const { response } = await api.Match.list(puuid, gameRegion);
    const matchList = response;

    const matchDetails = await api.Match.get(matchList[number - 1], gameRegion);

    const myBoard: Participant = matchDetails.response.info.participants.find(item => {
      return item.puuid === puuid;
    });

    const augments = [];
    myBoard.augments.map(augment => {
      const augmentNameWithoutSet = augment.substr(augment.lastIndexOf("_") + 1).replace(/([A-Z])/g, " $1");

      augments.push(augmentNameWithoutSet.charAt(0).toUpperCase() + augmentNameWithoutSet.slice(1));
    });
    const { sortedTraits, sortedUnits } = getSortedTftMatchData(myBoard.traits, myBoard.units);

    const message = createTftMatchText(myBoard.placement, myBoard.level, augments, sortedTraits, sortedUnits);
    return message;
  } catch (err) {
    console.log("Error while getting tft user stats" + err);
    const message = `Nie znaleziono meczu TFT dla ${nickname ? nickname + "#" + (server || "EUW") : `streamera`}`;
    return message;
  }
};

export const getStats = async (streamer: string, nickname: string, server: string): Promise<string> => {
  const [data] = await getRiot(streamer);
  const tftRegion = server ? serverNameToServerId[server] : "EUW1";
  let message = "";
  try {
    if (nickname) {
      const summoner = await getByRiotName(nickname, tftRegion, api, apiRiot);
      const userData = await api.League.get(summoner.id, tftRegion);
      const userInfo = userData.response[0];

      message = getTftUserStatsText(summoner.gameName, userInfo);
      return message;
    } else {
      const server: any = data.activeRiotAccount.server;
      const userData = await api.League.get(data.activeRiotAccount.id, server);
      const userInfo = userData.response[0];

      message = getTftUserStatsText(data.activeRiotAccount.name, userInfo);
      return message;
    }
  } catch (err) {
    console.log("Error while getting tft user stats" + err);
    message = `Nie znaleziono statystyk TFT dla ${nickname ? nickname + "#" + (server || "EUW") : `streamera`}`;
    return message;
  }
};

export const getRank = async (server: string): Promise<string> => {
  const serverName = server ? serverNameToServerId[server] : "EUW1";
  const { response: chall } = await api.League.getChallengerLeague(serverName);
  let message = "";
  let topRank = [];

  if (chall.entries.length > 10) {
    topRank = chall.entries.sort((a, b) => b.leaguePoints - a.leaguePoints).slice(0, 10);
  } else {
    topRank = chall.entries.sort((a, b) => b.leaguePoints - a.leaguePoints);
  }

  if (topRank.length !== 10) {
    const { response: grand } = await api.League.getGrandMasterLeague(serverName);
    if (grand.entries.length > 10 - topRank.length) {
      topRank = [
        ...topRank,
        ...grand.entries.sort((a, b) => b.leaguePoints - a.leaguePoints).slice(0, 10 - topRank.length),
      ];
    } else {
      topRank = [...topRank, ...grand.entries];
    }
  }

  if (topRank.length !== 10) {
    const { response: master } = await api.League.getMasterLeague(serverName);
    if (master.entries.length > 10 - topRank.length) {
      topRank = [
        ...topRank,
        ...master.entries.sort((a, b) => b.leaguePoints - a.leaguePoints).slice(0, 10 - topRank.length),
      ];
    } else {
      topRank = [...topRank, ...master.entries];
    }
  }

  const sortedTopRank = topRank.sort((a, b) => b.leaguePoints - a.leaguePoints);

  const topRankToText = await Promise.all(
    sortedTopRank.map(async (user, index) => {
      const name = await getUserNameFromSummonerId(user.summonerId, serverName);

      return `TOP${index + 1} ${name} ${user.leaguePoints}LP, `;
    })
  );

  return topRankToText.join("");
};
