import { Router } from 'express';
import { tierController } from '../controllers/tierController';
import { validate } from '../middlewares/validate';
import { createTierSchema, updateTierSchema } from '../validators/schemas';

const router = Router();

router.get('/', (req, res, next) => tierController.findByProject(req, res, next));
router.post('/', validate(createTierSchema), (req, res, next) => tierController.create(req, res, next));
router.put('/:id', validate(updateTierSchema), (req, res, next) => tierController.update(req, res, next));
router.delete('/:id', (req, res, next) => tierController.delete(req, res, next));

export default router;
