/**
 * TODO: This Entity is used to keep track of the last time the server scan for changes, minimizes the amount of work to scan
 *
 * For example, if the worker scans at 15:13 2025/01/09, then it will be saved to MongoDB as 15:13 2025/01/09.
 * Next time the server crashes at 20:00 2025/01/23, the server will then fetch the document from MongoDB and scan only from 15:13 2025//01/09 to current time, not the whole org.
 *
 * Hmm update the document or create new document to have checkup history? If too much checkup, it is bad for db...
 */

import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const sessionSchema = new Schema({
  last_checked: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    required: true,
  },
});

export type Session = InferSchemaType<typeof sessionSchema> & {
  _id: mongoose.Schema.Types.ObjectId;
};

export const SessionModel = model<Session>("Session", sessionSchema);
