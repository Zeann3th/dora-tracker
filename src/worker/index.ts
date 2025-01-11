import "dotenv/config";
import env from "@/env";
import { Job, Worker } from "bullmq";
import mongoose from "mongoose";
import { connectDB } from "@/services/mongoose";
import { TaskController } from "./controllers/task.controller";

export const startWorker = async (): Promise<Worker> => {
  return new Promise<Worker>(async (resolve, reject) => {
    try {
      await connectDB("worker");

      const worker = new Worker(
        "runtimeQueue",
        async (job) => {
          switch (job.name) {
            case "dev":
              await TaskController.scanDevEnv(job);
              break;
            case "uat":
              await TaskController.scanUatEnv(job);
              break;
            case "prod":
              await TaskController.scanProdEnv(job);
              break;
            default:
              console.log(`[Worker]: Unhandled job name: ${job.name}`);
              break;
          }
        },
        {
          connection: { url: env.REDIS_URL },
          removeOnFail: { count: 5 },
          removeOnComplete: { age: 300 },
        },
      );

      worker.on("active", (job) => {
        console.log(`[Worker]: Job ${job.id} is now active!`);
      });

      worker.on("completed", (job) => {
        console.log(`[Worker]: Job ${job.id} has completed!`);
      });

      worker.on("failed", (job, err) => {
        console.log(`[Worker]: Job ${job?.id} has failed with ${err}`);
      });

      console.log("✅[Worker]: Background worker is ready");
      resolve(worker);
    } catch (error) {
      reject(error);
    }
  });
};
