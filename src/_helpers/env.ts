import dotenv from "dotenv";
import { z } from "zod";
import config from "../../config.json";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  PORT: z.coerce.number().int().positive().optional().default(4000),
  JWT_SECRET: z.string().min(1).optional().default(config.jwtSecret),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(18).optional().default(12),
  DB_HOST: z.string().min(1).optional().default(config.database.host),
  DB_PORT: z.coerce.number().int().positive().optional().default(config.database.port),
  DB_USER: z.string().min(1).optional().default(config.database.user),
  DB_PASSWORD: z.string().optional().default(config.database.password),
  DB_NAME: z.string().min(1).optional().default(config.database.database),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
