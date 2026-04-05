import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import Joi from "joi";
import { db } from "../_helpers/db";
import { authenticate } from "../_middleware/authenticate";
import { validateRequest } from "../_middleware/validateRequest";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Requests
 * /auth/requests/me:
 *   get:
 *     summary: List current user's requests
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 * /auth/requests:
 *   post:
 *     summary: Create a request (current user)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */

router.use(authenticate);
router.get("/me", getMine);
router.post("/", createSchema, create);

export default router;

function createSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    type: Joi.string().trim().min(1).max(200).required(),
    items: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().min(1).max(200).required(),
          qty: Joi.number().integer().min(1).required(),
        }),
      )
      .min(1)
      .required(),
  });
  validateRequest(req, next, schema);
}

function toClientRequest(reqRow: any) {
  const items = Array.isArray(reqRow.items)
    ? reqRow.items.map((i: any) => ({ name: i.name, qty: i.qty }))
    : [];
  return {
    id: reqRow.id,
    date: reqRow.date,
    type: reqRow.type,
    status: reqRow.status,
    items,
  };
}

async function getMine(req: Request, res: Response): Promise<void> {
  const userId = Number(res.locals.auth?.sub);
  if (!Number.isFinite(userId)) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const requests = await db.Request.findAll({
    where: { userId },
    include: [{ model: db.RequestItem, as: "items" }],
    order: [["createdAt", "DESC"]],
  });

  res.json(requests.map(toClientRequest));
}

async function create(req: Request, res: Response): Promise<void> {
  const userId = Number(res.locals.auth?.sub);
  if (!Number.isFinite(userId)) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const type = String(req.body.type).trim();
  const items = (req.body.items || []) as Array<{ name: string; qty: number }>;

  const created = await db.Request.create({
    userId,
    type,
    status: "Pending",
  });

  await db.RequestItem.bulkCreate(
    items.map((i) => ({
      requestId: created.id,
      name: String(i.name).trim(),
      qty: Number(i.qty),
    })),
  );

  const withItems = await db.Request.findByPk(created.id, {
    include: [{ model: db.RequestItem, as: "items" }],
  });

  res.status(201).json(withItems ? toClientRequest(withItems) : toClientRequest(created));
}
