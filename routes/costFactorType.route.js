const express = require('express');
const router = express.Router();

const controller = require("../controller/costFactorType.controller");

router.get('/', controller.index);
router.post('/create', controller.createPost);
router.get('/edit/:id', controller.edit);
router.patch('/edit/:id', controller.editPatch);

module.exports = router;