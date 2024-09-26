import ComfyJS from "comfy.js";

import { nextSong, pauseSong, refreshDevices, changeVolumeOnTime, setVolume, currentlyPlaying } from "../../spotify";
import { getSong, updateSong } from "../../../controllers/SongController";
import { getCommand, updateCommand } from "../../../controllers/CommandController";
import { timeRequest, removeBlockedSong } from "../../streamElements";
import { changeBadWords } from "../../../helpers";
import { timeout } from "./helix";
import { getAllCredentials } from "../../../controllers/CredentialsController";
import { isLive, sendKickMessage, streamersIds } from "../../kick";

let timeoutVolume = {};

export const setTimeoutVolume = async (): Promise<void> => {
  try {
    const allUsers = await getAllCredentials();
    timeoutVolume = allUsers.reduce((acc, key) => ({ ...acc, [key.streamer]: null }), {});
  } catch {
    console.log("Error when call setTimeoutVolume");
  }
};

export const messages = () => {
  ComfyJS.onChat = async (user, message, flags, self, extra) => {
    try {
      const [{ addSongID, skipSongID, skipSongs, volumeChanger }] = await getSong(extra.channel);
      const [{ rollID, banID, slotsID }] = await getCommand(extra.channel);

      if (
        user === "StreamElements" &&
        (message.lastIndexOf("to the queue") != -1 || message.lastIndexOf("do kolejki") != -1)
      ) {
        if (skipSongs.pauseAfterRequest) {
          pauseSong(extra.channel);
        }

        const removedSongList = await removeBlockedSong(extra.channel, skipSongs?.isActive, skipSongs?.size);

        if (removedSongList.length > 0) {
          removedSongList.forEach(x => {
            if (isLive && streamersIds.find(x => x.name === extra.channel)) {
              const streamerId = streamersIds.find(x => x.name === extra.channel);
              sendKickMessage(
                `@${changeBadWords(x.user)} ${changeBadWords(x.title)} | ${x.reason}`,
                streamerId.chatroomId,
                extra.channel
              );
            }
          });
        }
      }

      if (message == "skip" && user === "DynaM1X1") {
        try {
          const spotifyData = await currentlyPlaying(extra.channel);

          if (spotifyData?.is_playing) {
            nextSong(extra.channel);
          } else {
            ComfyJS.Say("!skip", extra.channel);
            await timeRequest(extra.channel, "skip");
          }
        } catch (err) {
          console.log(`Error when skip song ${err}`);
        }
      }

      if (
        isLive &&
        streamersIds.find(x => x.name === extra.channel) &&
        user === "StreamElements" &&
        !(message.indexOf("Graj i kupu") !== -1)
      ) {
        const streamerId = streamersIds.find(x => x.name === extra.channel);
        sendKickMessage(message, streamerId.chatroomId, extra.channel);
      }
    } catch (err) {
      console.log(`Error when use message ${err}`);
    }
  };
};

function randomInt(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
