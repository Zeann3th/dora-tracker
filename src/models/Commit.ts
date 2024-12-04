import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const commitSchema = new Schema({
  sha: {
    type: String,
    required: true,
  },
  repo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Repository",
    required: true,
  },
  created_at: {
    type: Date,
    required: true,
  },
  commit_message: String,
  author: String,
});

export type Commit = InferSchemaType<typeof commitSchema> & {
  _id: mongoose.Schema.Types.ObjectId;
};

export const CommitModel = model<Commit>("Commit", commitSchema);
