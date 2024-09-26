import { KickApiWrapper } from "kick.com-api";
import { createClient } from "@retconned/kick-js";
import ComfyJS from "comfy.js";
import axios from "axios";
import { changeBadWords, plToEnAlphabet } from "../../helpers";
import { getWeather } from "../twitch/events/twitch";
import { currentlyPlaying } from "../spotify";
import { getLolMatchStats, getLolUserStats } from "../riot/lol";
import { getStats, tftMatchList } from "../riot/tft";
import { getRiot } from "../../controllers/RiotController";
import { songPlayingNow } from "../streamElements";
import { thanks } from "../twitch/events/events";

const client = createClient("overpow", { logger: true });

const kickApi = new KickApiWrapper({
  userAgent: "DynamixBot",
});

export let isLive: boolean = false;
export let streamersIds: { name: string; chatroomId: number }[] = [];

const getKickChannelData = async nick => {
  try {
    const data = await kickApi.fetchChannelData(nick);
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const initKickChat = async streamer => {
  const streamerData = await getKickChannelData(streamer);
  isLive = !!streamerData.livestream;

  setInterval(async () => {
    const streamerData = await getKickChannelData(streamer);
    isLive = streamerData.livestream;
  }, 10 * 60 * 1000);

  try {
    client.on("ready", () => {
      console.log(`Bot ready & logged into ${client.user?.tag}!, to stream: ${streamer}`);
    });
    const [{ activeRiotAccount }] = await getRiot(streamer);

    client.login({ token: process.env.KICK_TOKEN, cookies: process.env.KICK_COOKIES });

    client.on("Subscription", async subscription => {
      console.log(`New subscription 💰 : ${subscription}`);
      sendKickMessage(`${subscription.username} 'dzięki za suba Flowie'`, streamerData.chatroom.id, streamer);
    });

    client.on("ChatMessage", async message => {
      const messageArray: string[] = message.content.split(" ");
      const commandName = messageArray[0];
      const restCommand = messageArray.slice(1).join(" ");
      const user = message.sender.username;

      if (!streamersIds.find(x => x.name === streamer)) {
        streamersIds.push({ name: streamer, chatroomId: streamerData.chatroom.id });
      }

      if (commandName === "!sr" && isLive) {
        ComfyJS.Say("!sr " + changeBadWords(restCommand), streamer);
      }

      if (commandName === `!songlist`) {
        console.log("dupa");
        sendKickMessage(
          `@${user} Kolejkę żądań utworu możesz znaleźć pod adresem: https://streamelements.com/${streamer}/mediarequest`,
          streamerData.chatroom.id,
          streamer
        );
      }

      if (commandName === "!dynamix") {
        sendKickMessage("bot work", streamerData.chatroom.id, streamer);
      }

      if (commandName === "!weather" || commandName === "!pogoda") {
        try {
          const { temp, speed, description } = await getWeather(plToEnAlphabet(restCommand));

          const weatherIcon = {
            bezchmurnie: "☀️",
            pochmurnie: "🌥️",
            "zachmurzenie małe": "🌤️",
            "zachmurzenie umiarkowane": "🌥️",
            "zachmurzenie duże": "☁️",
            mgła: "🌫️",
            zamglenia: "🌫️",
            "umiarkowane opady deszczu": "🌧️",
            "słabe opady deszczu": "🌧️",
          };

          if (temp) {
            sendKickMessage(
              `@${user} Jest ${Math.round(temp - 273)} °C, ${description} ${
                weatherIcon[description] || ""
              } wiatr wieje z prędkością ${speed} km/h (${changeBadWords(restCommand)})`,
              streamerData.chatroom.id,
              streamer
            );
          } else {
            sendKickMessage(`@${user} Nie znaleziono`, streamerData.chatroom.id, streamer);
          }
        } catch (err) {
          console.log(`Error when use !pogoda on twitch (${err})`);
        }
      }

      if (commandName == "!playlist" || commandName == "!playlista") {
        try {
          const spotifyData = await currentlyPlaying(streamer);

          let url = spotifyData.context ? spotifyData.context.external_urls.spotify : "Nieznana Playlista";

          spotifyData &&
            sendKickMessage(`@${user} aktualnie leci ta playlista: ${url} catJAM `, streamerData.chatroom.id, streamer);
        } catch (err) {
          console.log(`Error when use !playlist on twitch (${err})`);
        }
      }

      if (
        commandName === "!stats" ||
        commandName === "!staty" ||
        commandName === "!statylol" ||
        commandName === "!statytft"
      ) {
        try {
          const NickNameAndServer = restCommand ? restCommand.split(", ") : [null, null];
          let stats;

          switch (commandName) {
            case "!statylol": {
              stats = await getLolUserStats(streamer, NickNameAndServer[0], NickNameAndServer[1]?.toUpperCase());
              break;
            }
            case "!statytft": {
              stats = await getStats(streamer, NickNameAndServer[0], NickNameAndServer[1]?.toUpperCase());
              break;
            }
            default: {
              if (activeRiotAccount?.isLol) {
                stats = await getLolUserStats(streamer, NickNameAndServer[0], NickNameAndServer[1]?.toUpperCase());
              } else {
                stats = await getStats(streamer, NickNameAndServer[0], NickNameAndServer[1]?.toUpperCase());
              }
              break;
            }
          }

          sendKickMessage(changeBadWords(stats), streamerData.chatroom.id, streamer);
        } catch (err) {
          console.log(`Error when use !staty on twitch (${err})`);
        }
      }

      if (
        commandName === "!matches" ||
        commandName === "!mecze" ||
        commandName === "!meczelol" ||
        commandName === "!meczetft"
      ) {
        try {
          const NickNameAndServer = restCommand ? restCommand.split(", ") : [null, null];
          const props = [streamer, NickNameAndServer[0], NickNameAndServer[1] && NickNameAndServer[1].toUpperCase()];
          let matchesList;
          switch (commandName) {
            case "!meczelol": {
              matchesList = await getLolMatchStats(props[0], props[1], props[2]);
              break;
            }
            case "!meczetft": {
              matchesList = await tftMatchList(props[0], props[1], props[2]);
              break;
            }
            default: {
              if (activeRiotAccount?.isLol) {
                matchesList = await getLolMatchStats(props[0], props[1], props[2]);
              } else {
                matchesList = await tftMatchList(props[0], props[1], props[2]);
              }
              break;
            }
          }

          sendKickMessage(`${matchesList}`, streamerData.chatroom.id, streamer);
        } catch (err) {
          console.log(`Error when use !mecze on twitch (${err})`);
        }
      }

      if (commandName === "!song" || commandName === "!coleci") {
        try {
          const spotifyData = await currentlyPlaying(streamer);
          const { title, link, userAdded } = await songPlayingNow(streamer);

          if (!spotifyData?.is_playing) {
            sendKickMessage(
              `@${user} ${title} ${userAdded && " | dodał/a " + userAdded + " "} ${link} `,
              streamerData.chatroom.id,
              streamer
            );
          } else {
            let url = spotifyData?.item?.external_urls?.spotify ? spotifyData?.item?.external_urls?.spotify : "";
            let title = spotifyData?.item?.name ? spotifyData?.item?.name : "Nieznany tytuł utworu";
            let autor = "";
            if (spotifyData.item?.artists?.length > 0) {
              spotifyData.item?.artists?.forEach(artist => {
                autor += artist.name + ", ";
              });
            }

            spotifyData && sendKickMessage(`@${user} ${title} | ${autor} ${url}`, streamerData.chatroom.id, streamer);
          }
        } catch (err) {
          console.log(`Error when use !song on twitch (${err})`);
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
};

export const sendKickMessage = async (message, id, streamer) => {
  try {
    const response = await axios.post(
      `https://kick.com/api/v2/messages/send/${id}`,
      {
        content: message,
        type: "message",
      },
      {
        headers: {
          accept: "application/json, text/plain, */*",
          authorization: `Bearer ${process.env.KICK_TOKEN}`,
          "content-type": "application/json",
          "x-xsrf-token": process.env.KICK_XSRF_TOKEN,
          Referer: `https://kick.com/${streamer}`,
        },
      }
    );
    if (response.status === 200) {
      console.log(`Message sent successfully: ${message}`);
    } else {
      console.error(`Failed to send message. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// const { data } = await axios.get(`https://kick.com/kick-token-provider`);

// client.connect("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false");
// client.connect("wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0&flash=false");
// client.connect("wss://kcik.dynam1x.dev:7777", "echo-protocol");
