import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyRedis from "@fastify/redis";
import dotenv from "dotenv";
import Fastify from "fastify";
import { seedDatabase, sequelize } from "./config/database.js";
import redis from "./config/redis.js";
import authRoutes, {
  checkSession,
  verifyRole,
} from "./controllers/auth.controller.js";
import { FileController } from "./controllers/file.controller.js";
import charactersRoutes from "./controllers/laughariki.controller.js";
import Character from "./models/laughariki.model.js";
import * as AuthService from "./services/auth.service.js";
import { createUser } from "./services/user.service.js";

dotenv.config();

export const fastify = Fastify({
  logger: true,
});

fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
});
fastify.register(fastifyMultipart);
fastify.register(fastifyCookie, {
  secret: process.env.JWT_SECRET,
  hook: "onRequest",
  parseOptions: {}, // options for parsing cookies
});
fastify.register(fastifyJwt, {
  secret:
    process.env.JWT_SECRET || "your-very-strong-secret-key-here-32-chars-min",
  decode: { complete: true },
});
fastify.register(fastifyRedis, {
  client: redis,
  name: "redis",
});

fastify.decorate("authenticate", checkSession);
fastify.decorate("verifyRole", verifyRole);

fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(charactersRoutes, { prefix: "/api" });

fastify.post("/files", FileController.saveFile);
fastify.get("/files/:fileId", FileController.getFile);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: process.env.NODE_ENV !== "production" });

    await createUser("admin", "admin123", "admin");
    await createUser("user", "user123");

    await seedDatabase(Character);

    await fastify.listen({
      port: process.env.PORT || 8000,
      host: "0.0.0.0",
    });

    fastify.log.info(`Сервер запущен на ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
