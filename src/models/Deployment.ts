import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const deploymentSchema = new Schema({
  repo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Repository",
    required: true,
  },
  commit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Commit",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  status: {
    type: String,
  },
  started_at: {
    type: Date,
    required: true,
  },
  finished_at: {
    type: Date,
  },
  duration: {
    type: Number,
    default: function (this: { started_at: Date; finished_at?: Date }) {
      if (!this.finished_at) {
        return null;
      }
      return (this.finished_at.getTime() - this.started_at.getTime()) / 1000;
    },
  },
});

export type Deployment = InferSchemaType<typeof deploymentSchema> & {
  _id: mongoose.Schema.Types.ObjectId;
};

export const DeploymentModel = model<Deployment>(
  "Deployment",
  deploymentSchema,
);
