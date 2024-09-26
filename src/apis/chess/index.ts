import ChessWebAPI from "chess-web-api";
let chessAPI = new ChessWebAPI();

export const getChessUser = async (name: string): Promise<string> => {
  try {
    const { body } = await chessAPI.getPlayer(name);
    const userStatsAllData = await chessAPI.getPlayerStats(name);
    const userInfo = body;
    const userStats = userStatsAllData.body;

    const bulletData = userStats.chess_bullet ? `| BULLET: ${userStats.chess_bullet.last.rating}` : "";
    const blitzData = userStats.chess_blitz ? `| BLITZ: ${userStats.chess_blitz.last.rating}` : "";
    const rapidData = userStats.chess_rapid ? `| RAPID: ${userStats.chess_rapid.last.rating}` : "";
    const tacticsData = userStats.chess_bullet ? `| ZADANIA: najwyżej ${userStats.tactics.highest.rating}` : "";
    const bestRapidGame =
      userStats.chess_rapid && userStats.chess_rapid.best.game
        ? `| gra o najwyższy ranking rapid: ${userStats.chess_rapid.best.game}`
        : "";

    const userInfoToReturn = `staty: ${userInfo.username} ${rapidData} ${blitzData} ${bulletData} ${tacticsData} ${bestRapidGame}`;

    return userInfoToReturn;
  } catch (err) {
    console.log(`Error while getting chess player (${err})`);
  }
};

export const getLastGame = async (name: string): Promise<string> => {
  try {
    const now = new Date();

    let {
      body: { games },
    } = await chessAPI.getPlayerCompleteMonthlyArchives(name, now.getFullYear(), now.getMonth() + 1);
    const lastGame = games[games.length - 1];

    if (games.length === 0 && now.getMonth() !== 0) {
      games = await chessAPI.getPlayerCompleteMonthlyArchives(name, now.getFullYear(), now.getMonth());
    }

    const lastGameResponse =
      games.length !== 0 ? `ostatnia gierka: ${lastGame.url}` : "niestety nie można wysłać ostatniej gry";

    return lastGameResponse;
  } catch (err) {
    console.log(`Error while getting chess last game (${err})`);
  }
};
