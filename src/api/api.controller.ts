import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../../config.json";
import { db } from "../_helpers/db";
import { Role } from "../_helpers/role";
import accountsController from "../accounts/accounts.controller";
import departmentsController from "../departments/departments.controller";
import employeesController from "../employees/employees.controller";
import requestsController from "../requests/requests.controller";
import { validateRequest } from "../_middleware/validateRequest";
import { authenticate, requireAdmin } from "../_middleware/authenticate";

const router = Router();

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

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

function toClientRole(role: string): string {
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
  };
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
  const { username, password, firstName, lastName } = req.body as {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  };

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

  res.status(201).json({ message: "Registration successful" });
}

function loginSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    username: Joi.string().trim().min(3).max(100).required(),
    password: Joi.string().min(6).required(),
  });
  validateRequest(req, next, schema);
}

async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username: string; password: string };

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

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: "7d",
  });

  res.json({ token, user: toClientUser(user) });
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

  res.json({ user: toClientUser(user) });
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
