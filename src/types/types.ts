import { InferSchemaType } from "mongoose";
import { CommandSchema } from "../models/Command";
import { CredentialsSchema } from "../models/Credentials";
import { RiotSchema } from "../models/Riot";
import { SongSchema } from "../models/Song";

export type Command = InferSchemaType<typeof CommandSchema>;
export type Credentials = InferSchemaType<typeof CredentialsSchema>;
export type Riot = InferSchemaType<typeof RiotSchema>;
export type Song = InferSchemaType<typeof SongSchema>;

type Image = {
  url: string;
  height: number;
  width: number;
};

export type UserProfile = {
  country: string;
  display_name: string;
  email: string;
  explicit_content: {
    filter_enabled: boolean;
    filter_locked: boolean;
  };
  external_urls: { spotify: string };
  followers: { href: string; total: number };
  href: string;
  id: string;
  images: Image[];
  product: string;
  type: string;
  uri: string;
};

export type PLayingSong = {
  isPlayingNow: boolean;
  title: string;
  link: string;
  userAdded: string;
};

export type BlockedSong = {
  user: string;
  title: string;
  reason: string;
};
