import env from "@/env";
import { Queue } from "bullmq";

const queue = new Queue("runtimeQueue", {
  connection: {
    url: env.REDIS_URL,
  },
});

queue.on("waiting", (job) => {
  console.log(`Job ${job.id} is added to queue`);
});

queue.on("error", (err) => {
  console.log(err);
});

export default queue;
