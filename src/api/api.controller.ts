import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../_helpers/db";
import { env } from "../_helpers/env";
import { Role } from "../_helpers/role";
import accountsController from "../accounts/accounts.controller";
import departmentsController from "../departments/departments.controller";
import employeesController from "../employees/employees.controller";
import requestsController from "../requests/requests.controller";
import { validateRequest } from "../_middleware/validateRequest";
import { authenticate, requireAdmin } from "../_middleware/authenticate";

const router = Router();

const BCRYPT_ROUNDS = env.BCRYPT_ROUNDS;

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required: [username, password, firstName, lastName]
 *       properties:
 *         username: { type: string, example: "user@example.com" }
 *         password: { type: string, example: "password123" }
 *         firstName: { type: string, example: "John" }
 *         lastName: { type: string, example: "Doe" }
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *     LoginRequest:
 *       type: object
 *       required: [username, password]
 *       properties:
 *         username: { type: string, example: "user@example.com" }
 *         password: { type: string, example: "password123" }
 *     AuthUser:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         username: { type: string, example: "user@example.com" }
 *         email: { type: string, example: "user@example.com" }
 *         firstName: { type: string, example: "John" }
 *         lastName: { type: string, example: "Doe" }
 *         role: { type: string, enum: [admin, user], example: "user" }
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token: { type: string }
 *         user:
 *           $ref: "#/components/schemas/AuthUser"
 *     ProfileResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: "#/components/schemas/AuthUser"
 */

export interface RegisterRequestBody {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponseBody {
  message: string;
}

export interface LoginRequestBody {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "user";
}

export interface LoginResponseBody {
  token: string;
  user: AuthUser;
}

export interface ProfileResponseBody {
  user: AuthUser;
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterRequest"
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RegisterResponse"
 * /auth/login:
 *   post:
 *     summary: Login (JWT)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/LoginRequest"
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoginResponse"
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProfileResponse"
 */

router.post("/register", registerSchema, register);
router.post("/login", loginSchema, login);
router.get("/profile", authenticate, profile);
router.get("/admin/dashboard", authenticate, requireAdmin, adminDashboard);
router.get("/content/guest", guestContent);
router.use("/accounts", accountsController);
router.use("/departments", departmentsController);
router.use("/employees", employeesController);
router.use("/requests", requestsController);

export default router;

function toClientRole(role: string): AuthUser["role"] {
  const value = String(role || "");
  return value.toLowerCase() === "admin" || value === Role.Admin ? "admin" : "user";
}

function toClientUser(user: any) {
  return {
    id: user.id,
    username: user.email,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: toClientRole(user.role),
  } satisfies AuthUser;
}

function registerSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    username: Joi.string().trim().min(3).max(100).required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().trim().min(1).max(100).required(),
    lastName: Joi.string().trim().min(1).max(100).required(),
  });
  validateRequest(req, next, schema);
}

async function register(req: Request, res: Response): Promise<void> {
  const { username, password, firstName, lastName } = req.body as RegisterRequestBody;

  const existing = await db.User.findOne({ where: { email: username } });
  if (existing) {
    res.status(409).json({ error: "Username is already taken" });
    return;
  }

  const userCount = await db.User.count();
  const role = userCount === 0 ? Role.Admin : Role.User;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await db.User.create({
    email: username,
    passwordHash,
    title: "",
    firstName,
    lastName,
    role,
    verified: true,
  });

  res.status(201).json({ message: "Registration successful" } satisfies RegisterResponseBody);
}

function loginSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    username: Joi.string().trim().min(3).max(100).required(),
    password: Joi.string().min(6).required(),
  });
  validateRequest(req, next, schema);
}

async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as LoginRequestBody;

  const user = await db.User.scope("withHash").findOne({ where: { email: username } });
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ token, user: toClientUser(user) } satisfies LoginResponseBody);
}

async function profile(req: Request, res: Response): Promise<void> {
  const userId = Number(res.locals.auth?.sub);
  if (!Number.isFinite(userId)) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await db.User.findByPk(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: toClientUser(user) } satisfies ProfileResponseBody);
}

async function adminDashboard(req: Request, res: Response): Promise<void> {
  const totalUsers = await db.User.count();
  const totalEmployees = db.Employee ? await db.Employee.count() : 0;
  const totalDepartments = db.Department ? await db.Department.count() : 0;
  const totalRequests = db.Request ? await db.Request.count() : 0;
  res.json({
    totalUsers,
    totalEmployees,
    totalDepartments,
    totalRequests,
  });
}

function guestContent(req: Request, res: Response): void {
  res.json({
    message: "Welcome! Guest content is accessible without logging in.",
    serverTime: new Date().toISOString(),
  });
}
