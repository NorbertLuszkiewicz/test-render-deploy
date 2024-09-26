import axios, { AxiosRequestConfig } from "axios";
import { getAllSong, updateSong, getSong } from "../../controllers/SongController";
import { getAllCredentials, updateCredentials, getCredentials } from "../../controllers/CredentialsController";

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const TOKEN = "https://accounts.spotify.com/api/token";
const PLAY = "https://api.spotify.com/v1/me/player/play";
const PAUSE = "https://api.spotify.com/v1/me/player/pause";
const NEXT = "https://api.spotify.com/v1/me/player/next";
const VOLUME = "https://api.spotify.com/v1/me/player/volume";
const PLAYER = "https://api.spotify.com/v1/me/player";
const DEVICES = "https://api.spotify.com/v1/me/player/devices";

let timeoutVolume = {};

const getSpotifyHeader = (spotifyAccessToken: string): AxiosRequestConfig<{}> => {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${spotifyAccessToken}`,
    },
  };
};

export const setTimeoutVolume = async (): Promise<void> => {
  try {
    const allUsers = await getAllSong();
    timeoutVolume = allUsers.reduce((acc, key) => ({ ...acc, [key.streamer]: null }), {});
  } catch {
    console.log("Error when call setTimeoutVolume");
  }
};

export const addSpotify = async (streamer, code): Promise<{ status: string }> => {
  const body = `grant_type=authorization_code&code=${code}&redirect_uri=${process.env.BE_URL}callback`;

  try {
    const { data } = await axios.post(`${TOKEN}`, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(clientId + ":" + clientSecret).toString("base64")}`,
      },
    });

    await updateCredentials({
      streamer: streamer,
      spotifyAccessToken: data.access_token,
      spotifyRefreshToken: data.refresh_token,
    });

    return { status: "success" };
  } catch (err) {
    console.log(`Error while getting first token (${err})`);
    return err;
  }
};

export const startSong = async (streamer: string): Promise<any> => {
  const [{ spotifyAccessToken, device }] = await getCredentials(streamer);

  try {
    return await axios.put(`${PLAY}?device_id=${device}`, {}, getSpotifyHeader(spotifyAccessToken));
  } catch ({ response }) {
    console.log(`Error while starting song (${response.status} ${response.statusText})`);
  }
};

export const pauseSong = async (streamer: string): Promise<any> => {
  try {
    const [{ spotifyAccessToken, device }] = await getCredentials(streamer);

    return await axios.put(`${PAUSE}?device_id=${device}`, {}, getSpotifyHeader(spotifyAccessToken));
  } catch ({ response }) {
    console.log(`Error while stopping song (${response.status} ${response.statusText})`);
  }
};

export const nextSong = async (streamer: string): Promise<void> => {
  try {
    const [user] = await getCredentials(streamer);
    const { spotifyAccessToken, device } = user;
    return await axios.post(`${NEXT}?device_id=${device}`, {}, getSpotifyHeader(spotifyAccessToken));
  } catch ({ response }) {
    console.log(`Error while skipping song (${response.status} ${response.statusText})`);
  }
};

export const changeVolumeOnTime = async (streamer: string, min: number, max: number, time: number): Promise<void> => {
  try {
    let [{ spotifyAccessToken, device }] = await getCredentials(streamer);
    let [{ maxVolumeTime }] = await getSong(streamer);
    let newMaxVolumeTime = 0;

    await axios.put(`${VOLUME}?volume_percent=${max}&device_id=${device}`, {}, getSpotifyHeader(spotifyAccessToken));

    let now = Date.now();

    if (maxVolumeTime > now) {
      newMaxVolumeTime = maxVolumeTime + time;
    } else if (!maxVolumeTime || maxVolumeTime < now) {
      newMaxVolumeTime = now + time;
    }

    await updateSong({
      streamer: streamer,
      maxVolumeTime: newMaxVolumeTime,
    });

    clearTimeout(timeoutVolume[streamer]);
    timeoutVolume[streamer] = setTimeout(
      async () => {
        try {
          await axios.put(
            `${VOLUME}?volume_percent=${min}&device_id=${device}`,
            {},
            getSpotifyHeader(spotifyAccessToken)
          );
        } catch ({ response }) {
          console.log(`Error while volume changes to lower (${response.status} ${response.statusText})`);
        }
      },
      newMaxVolumeTime - now,
      streamer
    );
  } catch ({ response }) {
    console.log(`Error while volume changes to higher (${response.data} )`);
  }
};

export const setVolume = async (streamer: string, value: string): Promise<any> => {
  try {
    const [{ spotifyAccessToken, device }] = await getCredentials(streamer);

    return await axios.put(
      `${VOLUME}?volume_percent=${value}&device_id=${device}`,
      {},
      getSpotifyHeader(spotifyAccessToken)
    );
  } catch ({ response }) {
    console.log(`Error while volume changes (${response.status} ${response.statusText})`);
  }
};

export const refreshAccessToken = async (): Promise<void> => {
  try {
    const streamers = await getAllCredentials();

    streamers.forEach(async ({ streamer, spotifyRefreshToken }) => {
      if (streamer != "og1ii" && spotifyRefreshToken) {
        const body = `grant_type=refresh_token&refresh_token=${spotifyRefreshToken}&client_id=${clientId}`;

        const { data } = await axios.post(`${TOKEN}`, body, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(clientId + ":" + clientSecret).toString("base64")}`,
          },
        });

        await updateCredentials({
          streamer,
          spotifyAccessToken: data.access_token,
          spotifyRefreshToken: data.refresh_token,
        });
      }
    });
  } catch ({ response }) {
    console.log(`Error while resetting Spotify token (${response.status} ${response.statusText})`);
  }
};

export const currentlyPlaying = async (streamer: string) => {
  try {
    const [{ spotifyAccessToken }] = await getCredentials(streamer);
    const { data } = await axios.get(`${PLAYER}?market=US`, getSpotifyHeader(spotifyAccessToken));

    return data;
  } catch ({ response }) {
    console.log(`Error while getting currently song (${response.status} ${response.statusText})`);
  }
};

export const lastPlaying = async (streamer: string): Promise<SpotifyApi.PlayHistoryObject> => {
  try {
    const [{ spotifyAccessToken }] = await getCredentials(streamer);
    const { data } = await axios.get(`${PLAYER}/recently-played?limit=1`, getSpotifyHeader(spotifyAccessToken));

    return data?.items[0];
  } catch ({ response }) {
    console.log(`Error while getting last song (${response.status} ${response.statusText})`);
  }
};

export const refreshDevices = async (streamer: string): Promise<void> => {
  try {
    const [{ spotifyAccessToken }] = await getCredentials(streamer);

    const { data }: { data: SpotifyApi.UserDevicesResponse } = await axios.get(
      DEVICES,
      getSpotifyHeader(spotifyAccessToken)
    );
    console.log("devices: ", data);
    const device = data.devices.find(element => element.is_active)
      ? data.devices.find(element => element.is_active)
      : data.devices[0];

    await updateCredentials({
      streamer: streamer,
      device: device.id,
    });
  } catch ({ response }) {
    console.log(`Error while getting devices (${response})`);
  }
};
