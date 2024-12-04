import "dotenv/config";
import env from "@/env";
import { startServer } from "./server";
import { startWorker } from "./worker";
import cron from "node-cron";
import mongoose from "mongoose";
import { Worker } from "bullmq";
import { Server } from "http";
import axios from "axios";

let server: Server;
let worker: Worker;

async function bootstrap() {
  try {
    console.log("\n=== Starting DORA Tracker Services ===\n");

    // Start server and worker in parallel
    [server, worker] = await Promise.all([startServer(), startWorker()]);

    console.log("\n✨ All services are up and running!\n");

    // Periodic scan
    checkup();

    cron.schedule("0 0 0 */2 *", () => {
      checkup();
    });

    // Set up graceful shutdown handlers
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

async function checkup() {
  try {
    console.log("🔍 [Server]: Performing periodic scans...");

    const response = await axios.post(
      `http://localhost:${env.PORT}/api/v1/jobs`,
    );
    console.log("✅ [Server]: ", response.data.message);
  } catch (error) {
    console.error("❌ [Server]: Error during checkup:", error);
  }
}

async function shutdown() {
  // Gracefully shut down the Express server
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        console.log("✅ [Server]: Express server shut down");
        resolve();
      });
    });
  }

  // Gracefully shut down the worker if it's active
  if (worker) {
    await worker.close();
    console.log("✅ [Worker]: Background worker shut down");
  }

  // Gracefully close MongoDB connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log("✅ [Database]: MongoDB connection closed");
  }

  console.log("\n✨ All services have been shut down gracefully.");
  process.exit(0);
}

bootstrap();
