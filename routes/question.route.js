const express = require('express');
const router = express.Router();

const controller = require("../controller/question.controller");

router.get('/', controller.index);
router.post('/create', controller.createPost);
router.get('/edit/:id', controller.edit);
router.patch('/edit/:id', controller.editPatch);
router.delete('/delete/:id', controller.deleteQuestion);
router.patch('/change-status/:status/:id', controller.changeStatus);
router.get('/detail/:id', controller.detail);

module.exports = router;