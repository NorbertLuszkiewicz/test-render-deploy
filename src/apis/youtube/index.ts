import axios from "axios";
import { YT_AGE_RESTRICTED } from "../../types/variables";

type VideoCredentials = {
  isVideo: boolean;
  isBlocked: boolean;
};

export const isBlockedVideo = async (url: string, streamer: string, urlId: string): Promise<VideoCredentials> => {
  try {
    let id = urlId;
    if (url) {
      id = url.slice(url.lastIndexOf("v=") + 2);
      id = id.slice(0, id.indexOf("&"));
    }

    const { data } = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${id}&key=${process.env.YT_ID_TOKEN}`
    );

    const isVideo = data.pageInfo && data.pageInfo.totalResults;
    let isBlocked = false;

    if (
      data?.items[0]?.contentDetails?.regionRestriction?.blocked?.includes("PL") ||
      data?.items[0]?.contentDetails?.contentRating?.ytRating === YT_AGE_RESTRICTED
    ) {
      isBlocked = true;
    }

    const resultData = { isVideo, isBlocked };

    return resultData;
  } catch (err) {
    console.log(`Error while getting youtube video (${err} )`);
  }
};
