import { Song } from "../types/types";

import mongoose from "mongoose";
require("../models/Song");

const Song = mongoose.model("song");

export const addSong = (newSongData: Partial<Song>): void => {
  const newSong = new Song(newSongData);
  newSong.save();
};

export const getAllSong = async (): Promise<Song[]> => {
  try {
    const data: Song[] = await Song.find({});

    return data;
  } catch (err) {
    console.log(`Error while getting all Songs ${err}`);
  }
};

export const getSong = async (streamer: string): Promise<Song[]> => {
  try {
    const data = await Song.find({ streamer });
    return data;
  } catch (err) {
    console.log(`Error while getting Song ${err}`);
  }
};

export const updateSong = async (user: Partial<Song>): Promise<Song> => {
  try {
    return await Song.findOneAndUpdate({ streamer: user.streamer }, user);
  } catch (err) {
    console.log(`Error while updating Song ${err}`);
  }
};

export const deleteSong = (data: Song) => {
  Song.findByIdAndDelete({ streamer: data.streamer });
};
