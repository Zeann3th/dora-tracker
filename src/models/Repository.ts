import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const repositorySchema = new Schema({
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
});

export type Repository = InferSchemaType<typeof repositorySchema> & {
  _id: mongoose.Schema.Types.ObjectId;
};

export const RepositoryModel = model<Repository>(
  "Repository",
  repositorySchema,
);
