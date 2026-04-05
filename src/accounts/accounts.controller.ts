import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import { db } from "../_helpers/db";
import { authenticate, requireAdmin } from "../_middleware/authenticate";
import { validateRequest } from "../_middleware/validateRequest";

const router = Router();

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

router.use(authenticate, requireAdmin);
router.get("/", getAll);
router.post("/", createSchema, create);
router.put("/:id", updateSchema, update);
router.put("/:id/password", passwordSchema, setPassword);
router.delete("/:id", remove);

export default router;

function toAccount(user: any) {
  return {
    id: String(user.id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: String(user.role || "").toLowerCase() || "employee",
    verified: Boolean(user.verified),
  };
}

function createSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    firstName: Joi.string().trim().min(1).max(100).required(),
    lastName: Joi.string().trim().min(1).max(100).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().trim().min(1).max(50).required(),
    verified: Joi.boolean().required(),
  });
  validateRequest(req, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    firstName: Joi.string().trim().min(1).max(100).required(),
    lastName: Joi.string().trim().min(1).max(100).required(),
    email: Joi.string().trim().email().required(),
    role: Joi.string().trim().min(1).max(50).required(),
    verified: Joi.boolean().required(),
    password: Joi.string().min(6).optional(),
  });
  validateRequest(req, next, schema);
}

function passwordSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    password: Joi.string().min(6).required(),
  });
  validateRequest(req, next, schema);
}

async function getAll(req: Request, res: Response): Promise<void> {
  const users = await db.User.findAll({ order: [["createdAt", "DESC"]] });
  res.json(users.map(toAccount));
}

async function create(req: Request, res: Response): Promise<void> {
  const email = String(req.body.email).trim().toLowerCase();
  const existing = await db.User.findOne({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(String(req.body.password), BCRYPT_ROUNDS);
  const created = await db.User.create({
    title: "",
    firstName: String(req.body.firstName).trim(),
    lastName: String(req.body.lastName).trim(),
    email,
    passwordHash,
    role: String(req.body.role).trim().toLowerCase(),
    verified: Boolean(req.body.verified),
  });

  res.status(201).json(toAccount(created));
}

async function update(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const user = await db.User.scope("withHash").findByPk(id);
  if (!user) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const email = String(req.body.email).trim().toLowerCase();
  const emailConflict = await db.User.findOne({ where: { email } });
  if (emailConflict && Number(emailConflict.id) !== Number(user.id)) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const nextRole = String(req.body.role).trim().toLowerCase();
  if (String(user.role).toLowerCase() === "admin" && nextRole !== "admin") {
    const adminCount = await db.User.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      res.status(400).json({ error: "You cannot downgrade the last admin account." });
      return;
    }
  }

  const updates: Record<string, unknown> = {
    firstName: String(req.body.firstName).trim(),
    lastName: String(req.body.lastName).trim(),
    email,
    role: nextRole,
    verified: Boolean(req.body.verified),
  };

  const password = String(req.body.password || "").trim();
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  await user.update(updates);
  res.json(toAccount(user));
}

async function setPassword(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const user = await db.User.scope("withHash").findByPk(id);
  if (!user) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const passwordHash = await bcrypt.hash(String(req.body.password), BCRYPT_ROUNDS);
  await user.update({ passwordHash });
  res.json({ message: "Password updated" });
}

async function remove(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const authUserId = Number(res.locals.auth?.sub);
  if (Number.isFinite(authUserId) && authUserId === id) {
    res.status(400).json({ error: "You cannot delete your own account while logged in." });
    return;
  }

  const user = await db.User.findByPk(id);
  if (!user) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if (String(user.role).toLowerCase() === "admin") {
    const adminCount = await db.User.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      res.status(400).json({ error: "You cannot delete the last remaining admin account." });
      return;
    }
  }

  await user.destroy();
  res.json({ message: "Account deleted" });
}
