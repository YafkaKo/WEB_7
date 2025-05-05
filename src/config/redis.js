import Redis from "ioredis";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || "qazwsxedc",
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
};

const redis = new Redis(redisConfig);

// Проверка соединения при инициализации
redis
  .ping()
  .then(() => console.log("Successfully connected to Redis"))
  .catch((err) => console.error("Redis connection error:", err));

export async function printAllRedisData() {
  try {
    const keys = await redis.keys("*");
    console.log("Все ключи в Redis:", keys);

    for (const key of keys) {
      const type = await redis.type(key);
      console.log(`\nКлюч: ${key} (${type})`);

      switch (type) {
        case "string":
          console.log(await redis.get(key));
          break;
        case "hash":
          console.log(await redis.hgetall(key));
          break;
        case "list":
          console.log(await redis.lrange(key, 0, -1));
          break;
        case "set":
          console.log(await redis.smembers(key));
          break;
        case "zset":
          console.log(await redis.zrange(key, 0, -1, "WITHSCORES"));
          break;
        default:
          console.log("Неизвестный тип");
      }
    }
  } catch (err) {
    console.error("Ошибка при чтении Redis:", err);
  }
}

export default redis;
