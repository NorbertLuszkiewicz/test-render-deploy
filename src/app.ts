import express from "express";
import { MongoClient } from "mongodb";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import { refreshAccessToken, setTimeoutVolume } from "./apis/spotify";
import { setTimeoutVolume as setTimeoutVolumeStreamElements } from "./apis/streamElements";
import { refreshTwitchTokens } from "./apis/twitch/events/twitch";
import { twitchCommands } from "./apis/twitch";
import { checkActiveRiotAccount, updateRiotItemsAndChampions } from "./apis/riot/lol";

import router from "./routes";
import { initKickChat } from "./apis/kick";
// import { chepardInstreamly } from "./apis/twitch/events/helix";

const app = express();

const client = new MongoClient(`mongodb+srv://${process.env.MONGODB}&w=majority`);

function onInit(): void {
  console.log("INIT");
  initKickChat("overpow");
  twitchCommands();
  setTimeoutVolume();
  setTimeoutVolumeStreamElements();
  refreshAccessToken();
  refreshTwitchTokens();
  checkActiveRiotAccount();
  updateRiotItemsAndChampions();
  setInterval(refreshAccessToken, 30 * 60 * 1000);
  setInterval(checkActiveRiotAccount, 3 * 60 * 1000);
  setInterval(refreshTwitchTokens, 60 * 60 * 1000);
}

async function run(): Promise<any> {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    onInit();

    app.listen(process.env.PORT || 80);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/", router);
