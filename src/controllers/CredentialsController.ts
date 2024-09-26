import { Credentials } from "../types/types";

import mongoose from "mongoose";
require("../models/Credentials");

const Credentials = mongoose.model("credentials");

export const addCredentials = (newCredentialsData: Partial<Credentials>): void => {
  const newCredentials = new Credentials(newCredentialsData);
  newCredentials.save();
};

export const getAllCredentials = async (): Promise<Credentials[]> => {
  try {
    const data: Credentials[] = await Credentials.find({});

    return data;
  } catch (err) {
    console.log(`Error while getting all credentials ${err}`);
  }
};

export const getCredentials = async (streamer: string): Promise<Credentials[]> => {
  try {
    const data = await Credentials.find({ streamer });
    return data;
  } catch (err) {
    console.log(`Error while getting user ${err}`);
  }
};

export const updateCredentials = async (user: Partial<Credentials>): Promise<Credentials> => {
  try {
    return await Credentials.findOneAndUpdate({ streamer: user.streamer }, user);
  } catch (err) {
    console.log(`Error while updating user ${err}`);
  }
};

export const deleteCredentials = (data: Credentials) => {
  Credentials.findByIdAndDelete({ streamer: data.streamer });
};
