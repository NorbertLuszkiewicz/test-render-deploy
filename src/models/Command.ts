import mongoose from "mongoose";
const Schema = mongoose.Schema;

mongoose.connect(`mongodb+srv://${process.env.MONGODB}&w=majority`);

export const CommandSchema = new Schema({
  streamer: {
    type: String,
    required: true,
    unique: true,
  },
  rollID: {
    type: String,
    default: null,
  },
  banID: {
    type: String,
    default: null,
  },
  slotsID: {
    type: Array,
    default: null,
  },
  wheelwinners: {
    type: Array,
    default: [],
  },
  commandSwitch: {
    type: { weather: Boolean, tft: Boolean, chess: Boolean, wordle: Boolean, slots: Boolean, song: Boolean },
    default: { weather: true, tft: true, chess: true, wordle: true, slots: true, song: true },
  },
});

mongoose.model("command", CommandSchema);
