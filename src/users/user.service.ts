//src/users/user.service.ts
import bcrypt from "bcryptjs";
import { db } from "../_helpers/db";
import { env } from "../_helpers/env";
import { Role } from "../_helpers/role";
import { User, UserCreationAttributes } from "./user.model";

const BCRYPT_ROUNDS = env.BCRYPT_ROUNDS;

export const userService = {
  getAll,
  getAllPaged,
  getById,
  create,
  update,
  delete: _delete,
};

async function getAll(): Promise<User[]> {
  return await db.User.findAll();
}

export type UsersPagedResult = {
  data: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

async function getAllPaged(page: number, limit: number): Promise<UsersPagedResult> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * safeLimit;

  const result = await db.User.findAndCountAll({
    limit: safeLimit,
    offset,
    order: [["id", "ASC"]],
  });

  const total = Number(result.count) || 0;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    data: result.rows,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

async function getById(id: number): Promise<User> {
  return await getUser(id);
}

async function create(
  params: UserCreationAttributes & { password: string },
): Promise<void> {
  // Check if email already exists
  const existingUser = await db.User.findOne({
    where: { email: params.email },
  });
  if (existingUser) {
    throw new Error(`Email "${params.email}" is already registered`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);

  // Create user (exclude password from saved fields)
  await db.User.create({
    ...params,
    passwordHash,
    role: params.role || Role.User, // Default to User role
  } as UserCreationAttributes);
}

async function update(
  id: number,
  params: Partial<UserCreationAttributes> & { password?: string },
): Promise<void> {
  const user = await getUser(id);
  // Hash new password if provided
  if (params.password) {
    params.passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
    delete params.password; // Remove plain password
  }

  // Update user
  await user.update(params as Partial<UserCreationAttributes>);
}

async function _delete(id: number): Promise<void> {
  const user = await getUser(id);
  await user.destroy();
}

// Helper: Get user or throw error
async function getUser(id: number): Promise<User> {
  const user = await db.User.scope("withHash").findByPk(id);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}
