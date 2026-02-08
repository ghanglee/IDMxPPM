const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const specsController = require('../controllers/specsController');

router.get('/', auth, specsController.listSpecs);
router.get('/:id', auth, specsController.getSpec);
router.post('/', auth, specsController.createSpec);
router.put('/:id', auth, specsController.updateSpec);
router.delete('/:id', auth, specsController.deleteSpec);

module.exports = router;
