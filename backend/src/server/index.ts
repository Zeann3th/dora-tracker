import env from "@/env";
import express, { Express, Request } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { limiter } from "./middlewares/ratelimit";
import { connectDB } from "@/services/mongoose";
import { Server } from "http";
import { jobRoutes, repositoryRoutes } from "./routes";

export const startServer = async (): Promise<Server> => {
  await connectDB("server");

  const app = express();
  const port = env.PORT || 3000;

  // Content-Type
  app.use(express.json());

  // Security
  app.use(
    cors<Request>({
      origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
      methods: ["HEAD", "GET", "POST"],
    }),
  );
  app.use(helmet());

  // Logging
  app.use(morgan(":method :url :status - :response-time ms"));

  // Rate limiting
  app.use(limiter);

  // Routes
  app.get("/health", (req, res) => {
    res.status(200).json({
      msg: "Server is healthy",
      last_checked: new Date().toISOString(),
    });
  });

  app.use("/api/v1/repos", repositoryRoutes);
  app.use("/api/v1/jobs", jobRoutes);

  return new Promise<Server>((resolve) => {
    const server = app.listen(port, () => {
      console.log("✅[Server]: Express server is ready");
      console.log(`
          \x1b[35m\n 🚀 DORA-tracker 1.0.0\x1b[0m
          - Local:\thttp://localhost:${port}/
          
          Note that the development build is not optimized.
          To create a production build, use \x1b[32mnpm run build\x1b[0m.\n
        `);
      resolve(server);
    });
  });
};