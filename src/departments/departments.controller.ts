import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import Joi from "joi";
import { db } from "../_helpers/db";
import { authenticate, requireAdmin } from "../_middleware/authenticate";
import { validateRequest } from "../_middleware/validateRequest";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Departments
 * /auth/departments:
 *   get:
 *     summary: List departments (admin)
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create department (admin)
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 * /auth/departments/{id}:
 *   put:
 *     summary: Update department (admin)
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     summary: Delete department (admin)
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */

router.use(authenticate, requireAdmin);
router.get("/", getAll);
router.post("/", createSchema, create);
router.put("/:id", updateSchema, update);
router.delete("/:id", remove);

export default router;

function toClientDepartment(dept: any) {
  return {
    id: String(dept.id),
    name: dept.name,
    description: dept.description,
  };
}

function createSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().allow("").max(500).optional(),
  });
  validateRequest(req, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().allow("").max(500).optional(),
  });
  validateRequest(req, next, schema);
}

async function getAll(req: Request, res: Response): Promise<void> {
  const departments = await db.Department.findAll({ order: [["name", "ASC"]] });
  res.json(departments.map(toClientDepartment));
}

async function create(req: Request, res: Response): Promise<void> {
  const name = String(req.body.name).trim();
  const descriptionRaw = req.body.description;
  const description = descriptionRaw ? String(descriptionRaw).trim() : "";

  const existing = await db.Department.findOne({ where: { name } });
  if (existing) {
    res.status(409).json({ error: "Department name already exists" });
    return;
  }

  const created = await db.Department.create({
    name,
    description: description || null,
  });
  res.status(201).json(toClientDepartment(created));
}

async function update(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid department id" });
    return;
  }

  const dept = await db.Department.findByPk(id);
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  const name = String(req.body.name).trim();
  const descriptionRaw = req.body.description;
  const description = descriptionRaw ? String(descriptionRaw).trim() : "";

  const conflict = await db.Department.findOne({ where: { name } });
  if (conflict && conflict.id !== dept.id) {
    res.status(409).json({ error: "Department name already exists" });
    return;
  }

  await dept.update({ name, description: description || null });
  res.json(toClientDepartment(dept));
}

async function remove(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid department id" });
    return;
  }

  const dept = await db.Department.findByPk(id);
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  await dept.destroy();
  res.json({ message: "Department deleted" });
}
