import env from "@/env";
import express, { Express, Request } from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "@/services/mongoose";
import { Server } from "http";
import { limiter } from "./middlewares/ratelimit";
import { apiRoutes } from "./routes";

export const startServer = async (): Promise<Server> => {
  await connectDB("server");

  const app = express();

  app.set("trust proxy", "127.0.0.1");

  // Content-Type
  app.use(express.json());

  // Security
  app.use(cors<Request>());

  app.use(helmet());

  // Logging
  app.use(morgan(":method :url :status - :response-time ms"));

  // Routes
  app.use("/api", limiter, apiRoutes);

  app.use(express.static(path.join(import.meta.dirname, "../../public")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(import.meta.dirname, "../../public/index.html"));
  });

  const port = env.PORT || 5000;
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
