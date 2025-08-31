const express = require('express');
const router = express.Router();

const controller = require("../controller/service.controller")

router.get('/', controller.index);
router.post('/create', controller.createPost);
router.delete("/delete/:id", controller.deleteItem);
router.get("/edit/:serviceId", controller.edit);
router.patch("/edit/:serviceId", controller.editPatch);
router.get("/detail/:serviceId", controller.detail);

module.exports = router;