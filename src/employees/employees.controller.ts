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
 *   - name: Employees
 * /auth/employees:
 *   get:
 *     summary: List employees (admin)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create employee (admin)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 * /auth/employees/{id}:
 *   put:
 *     summary: Update employee (admin)
 *     tags: [Employees]
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
 *     summary: Delete employee (admin)
 *     tags: [Employees]
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

function toClientEmployee(emp: any) {
  return {
    id: String(emp.id),
    employeeId: emp.employeeId,
    userEmail: emp.userEmail,
    position: emp.position,
    departmentId: String(emp.departmentId),
    hireDate: emp.hireDate,
  };
}

function createSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    employeeId: Joi.string().trim().min(1).max(100).required(),
    userEmail: Joi.string().trim().email().required(),
    position: Joi.string().trim().min(1).max(200).required(),
    departmentId: Joi.number().integer().positive().required(),
    hireDate: Joi.string().trim().allow("").optional(),
  });
  validateRequest(req, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    employeeId: Joi.string().trim().min(1).max(100).required(),
    userEmail: Joi.string().trim().email().required(),
    position: Joi.string().trim().min(1).max(200).required(),
    departmentId: Joi.number().integer().positive().required(),
    hireDate: Joi.string().trim().allow("").optional(),
  });
  validateRequest(req, next, schema);
}

async function getAll(req: Request, res: Response): Promise<void> {
  const employees = await db.Employee.findAll({ order: [["createdAt", "DESC"]] });
  res.json(employees.map(toClientEmployee));
}

async function create(req: Request, res: Response): Promise<void> {
  const employeeId = String(req.body.employeeId).trim();
  const userEmail = String(req.body.userEmail).trim().toLowerCase();
  const position = String(req.body.position).trim();
  const departmentId = Number(req.body.departmentId);
  const hireDateRaw = String(req.body.hireDate || "").trim();

  const dept = await db.Department.findByPk(departmentId);
  if (!dept) {
    res.status(400).json({ error: "Department not found" });
    return;
  }

  const user = await db.User.findOne({ where: { email: userEmail } });
  if (!user) {
    res.status(400).json({ error: "User not found for the given email" });
    return;
  }

  const created = await db.Employee.create({
    employeeId,
    userEmail,
    position,
    departmentId,
    hireDate: hireDateRaw || null,
  });

  res.status(201).json(toClientEmployee(created));
}

async function update(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid employee id" });
    return;
  }

  const employee = await db.Employee.findByPk(id);
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const employeeId = String(req.body.employeeId).trim();
  const userEmail = String(req.body.userEmail).trim().toLowerCase();
  const position = String(req.body.position).trim();
  const departmentId = Number(req.body.departmentId);
  const hireDateRaw = String(req.body.hireDate || "").trim();

  const dept = await db.Department.findByPk(departmentId);
  if (!dept) {
    res.status(400).json({ error: "Department not found" });
    return;
  }

  const user = await db.User.findOne({ where: { email: userEmail } });
  if (!user) {
    res.status(400).json({ error: "User not found for the given email" });
    return;
  }

  await employee.update({
    employeeId,
    userEmail,
    position,
    departmentId,
    hireDate: hireDateRaw || null,
  });

  res.json(toClientEmployee(employee));
}

async function remove(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid employee id" });
    return;
  }

  const employee = await db.Employee.findByPk(id);
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  await employee.destroy();
  res.json({ message: "Employee deleted" });
}
