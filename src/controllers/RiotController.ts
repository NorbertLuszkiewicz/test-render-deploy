import { Song, Riot, Credentials, Command } from "../types/types";

import mongoose from "mongoose";
require("../models/Riot");

const Riot = mongoose.model("riot");

export const addRiot = (newRiotData: Partial<Riot>): void => {
  const newRiot = new Riot(newRiotData);
  newRiot.save();
};

export const getAllRiot = async (): Promise<Riot[]> => {
  try {
    const data: Riot[] = await Riot.find({});

    return data;
  } catch (err) {
    console.log(`Error while getting all Riots ${err}`);
  }
};

export const getRiot = async (streamer: string): Promise<Riot[]> => {
  try {
    const data = await Riot.find({ streamer });
    return data;
  } catch (err) {
    console.log(`Error while getting Riot ${err}`);
  }
};

export const updateRiot = async (riot: Partial<Riot>): Promise<Riot> => {
  try {
    return await Riot.findOneAndUpdate({ streamer: riot.streamer }, riot);
  } catch (err) {
    console.log(`Error while updating Riot ${err}`);
  }
};

export const deleteRiot = (data: Riot) => {
  Riot.findByIdAndDelete({ streamer: data.streamer });
};
