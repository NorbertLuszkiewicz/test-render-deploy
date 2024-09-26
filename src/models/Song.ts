import mongoose from "mongoose";
const Schema = mongoose.Schema;

mongoose.connect(`mongodb+srv://${process.env.MONGODB}&w=majority`);

export const SongSchema = new Schema({
  streamer: {
    type: String,
    required: true,
    unique: true,
  },
  addSongID: {
    type: String,
    default: null,
  },
  skipSongID: {
    type: String,
    default: null,
  },
  volumeChanger: {
    type: {
      id: String,
      max: Number,
      min: Number,
      maxSR: Number,
      minSR: Number,
      time: Number,
    },
    default: null,
  },
  timeoutVolume: {
    type: Schema.Types.Mixed,
    default: null,
  },
  maxVolumeTime: {
    type: Number,
    default: null,
  },
  endTime: {
    type: Number,
    default: null,
  },
  skipSongs: {
    type: {
      isActive: Boolean,
      size: Number,
      pauseAfterRequest: Boolean,
    },
    default: {
      isActive: false,
      size: 0,
      pauseAfterRequest: false,
    },
  },
});

mongoose.model("song", SongSchema);
