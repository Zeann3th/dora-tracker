import mongoose, { Document, InferSchemaType, model, Schema } from "mongoose";

const repositorySchema = new Schema({
  gh_id: {
    type: Number,
  },
  owner: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  private: {
    type: Boolean,
    required: true,
  },
  default_branch: {
    type: String,
    required: true,
  },
  full_name: {
    type: String,
    default: function (this: { owner: String; name: String }) {
      return `${this.owner}/${this.name}`;
    },
  },
  last_scanned_at: {
    type: Date,
  },
});

export type Repository = InferSchemaType<typeof repositorySchema> & Document;

export const RepositoryModel = model<Repository>(
  "Repository",
  repositorySchema,
);
