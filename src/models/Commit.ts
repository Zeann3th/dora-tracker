import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const commitSchema = new Schema({
  _id: {
    type: String,
    unique: true,
  },
  repo_id: {
    type: Number,
    ref: "Repository",
    required: true,
  },
  branch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  commit_message: String,
  author: String,
});

type Commit = InferSchemaType<typeof commitSchema>;

export default model<Commit>("Commit", commitSchema);
