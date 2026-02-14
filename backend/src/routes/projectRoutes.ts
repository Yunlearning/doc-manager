import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { validate } from '../middlewares/validate';
import { createProjectSchema, updateProjectSchema } from '../validators/schemas';
import { authenticate } from '../middlewares/authenticate';
import { checkPermission } from '../middlewares/checkPermission';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Read — any logged-in user
router.get('/', (req, res, next) => projectController.findAll(req, res, next));
router.get('/:id', (req, res, next) => projectController.findById(req, res, next));

// Write — requires CREATE_PROJECT permission
router.post('/', checkPermission('CREATE_PROJECT'), validate(createProjectSchema), (req, res, next) => projectController.create(req, res, next));
router.put('/:id', checkPermission('CREATE_PROJECT'), validate(updateProjectSchema), (req, res, next) => projectController.update(req, res, next));
router.delete('/:id', checkPermission('CREATE_PROJECT'), (req, res, next) => projectController.delete(req, res, next));

export default router;
