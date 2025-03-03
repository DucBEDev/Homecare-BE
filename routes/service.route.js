const express = require('express');
const router = express.Router();

const controller = require("../controller/service.controller")

router.get('/', controller.index);
router.post('/create', controller.createPost);
router.patch("/change-multi", controller.changeMulti);
router.patch("/change-status/:status/:id", controller.changeStatus);
router.delete("/delete/:id", controller.deleteItem);
router.get("/edit/:id", controller.edit);
router.patch("/edit/:id", controller.editPatch);
router.get("/detail/:id", controller.detail);

module.exports = router;