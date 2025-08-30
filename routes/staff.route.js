const express = require('express');
const router = express.Router();

// Connect Multer library to upload images
const multer = require('multer');
const upload = multer();
const uploadCloud = require("../middlewares/uploadCloud.middleware");

const controller = require("../controller/staff.controller");

router.get('/', controller.index);
router.get('/create', controller.create);
router.post('/create', upload.single('avatar'), uploadCloud.upload, controller.createPost);
router.get('/edit/:id', controller.edit);
router.patch('/edit/:id', upload.single('avatar'), uploadCloud.upload, controller.editPatch);
router.get('/detail/:id', controller.detail);
router.get('/setOffDate/:id', controller.setOffDate);

module.exports = router;