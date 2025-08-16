const express = require('express');
const router = express.Router();

const controller = require("../controller/request.controller")

router.get('/', controller.index);
router.get('/create', controller.create);
router.post('/create', controller.createPost);
router.patch('/cancelAll/:requestId', controller.cancelAll);
router.get('/detail/:requestId', controller.detail);
router.patch('/cancelDetail/:requestDetailId', controller.cancelDetail);
router.patch('/changeStatus/:id', controller.changeStatus)

module.exports = router;