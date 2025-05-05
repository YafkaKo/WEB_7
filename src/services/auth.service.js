import redis, { printAllRedisData } from "../config/redis.js";
import { createSigner, createVerifier } from 'fast-jwt';
import dotenv from "dotenv";

const SESSION_PREFIX = 'token_';
const SESSION_TTL = 60 * 60; // 1 час в секундах

export const addSession = async (userId, token) => {
  const key = `${SESSION_PREFIX}${userId}`;
  console.log(`Adding token to Redis. Key: ${key}, Token: ${token}`);
  await redis.sadd(key, token);
  await redis.expire(key, SESSION_TTL);
};

export const removeSession = async (userId, token) => {
  await redis.srem(`${SESSION_PREFIX}${userId}`, token);
};

export const removeAllSessions = async () => {
  let cursor = '0';
  do {
    const result = await redis.scan(cursor, 'MATCH', `${SESSION_PREFIX}*`);
    cursor = result[0];
    if (result[1].length > 0) {
      await redis.del(...result[1]);
    }
  } while (cursor !== '0');
};

export const isValidSession = async (cookieName, token) => {
    try {
        // await printAllRedisData()
        const verifySync = createVerifier({ key: process.env.JWT_SECRET });
        const { iat, exp, ...payload } = verifySync(token);
        const existingToken = await redis.smembers(cookieName);

        if (token !== existingToken[0]) {
            return { error: 'Invalid token', payload: null }
        }

        return { error: null, payload }
    } catch (error) {
        console.log(error);

        return { error, payload: null }
    }
};



