import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { validate } from '../middlewares/validate';
import { createProjectSchema, updateProjectSchema } from '../validators/schemas';

const router = Router();

router.get('/', (req, res, next) => projectController.findAll(req, res, next));
router.get('/:id', (req, res, next) => projectController.findById(req, res, next));
router.post('/', validate(createProjectSchema), (req, res, next) => projectController.create(req, res, next));
router.put('/:id', validate(updateProjectSchema), (req, res, next) => projectController.update(req, res, next));
router.delete('/:id', (req, res, next) => projectController.delete(req, res, next));

export default router;
