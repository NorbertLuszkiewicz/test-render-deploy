import { Command } from "../types/types";

import mongoose from "mongoose";
require("../models/Command");

const Command = mongoose.model("command");

export const addCommand = (newCommandData: Partial<Command>): void => {
  const newCommand = new Command(newCommandData);
  newCommand.save();
};

export const getAllCommand = async (): Promise<Command[]> => {
  try {
    const data: Command[] = await Command.find({});

    return data;
  } catch (err) {
    console.log(`Error while getting all Commands ${err}`);
  }
};

export const getCommand = async (streamer: string): Promise<Command[]> => {
  try {
    const data = await Command.find({ streamer });
    return data;
  } catch (err) {
    console.log(`Error while getting Command ${err}`);
  }
};

export const updateCommand = async (command: Partial<Command>): Promise<Command> => {
  try {
    return await Command.findOneAndUpdate({ streamer: command.streamer }, command);
  } catch (err) {
    console.log(`Error while updating Command ${err}`);
  }
};

export const deleteCommand = (data: Command) => {
  Command.findByIdAndDelete({ streamer: data.streamer });
};
