import { Router } from 'express';
import { tierController } from '../controllers/tierController';
import { validate } from '../middlewares/validate';
import { createTierSchema, updateTierSchema } from '../validators/schemas';
import { authenticate } from '../middlewares/authenticate';
import { checkPermission } from '../middlewares/checkPermission';

const router = Router();

// All tier routes require authentication
router.use(authenticate);

// Read — any logged-in user
router.get('/', (req, res, next) => tierController.findByProject(req, res, next));

// Write — requires CREATE_PROJECT permission (managing tiers is part of project management)
router.post('/', checkPermission('CREATE_PROJECT'), validate(createTierSchema), (req, res, next) => tierController.create(req, res, next));
router.put('/:id', checkPermission('CREATE_PROJECT'), validate(updateTierSchema), (req, res, next) => tierController.update(req, res, next));
router.delete('/:id', checkPermission('CREATE_PROJECT'), (req, res, next) => tierController.delete(req, res, next));

export default router;
