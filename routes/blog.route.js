const express = require('express');
const router = express.Router();

// Connect Multer library to upload images
const multer = require('multer');
const upload = multer();
const uploadCloud = require("../middlewares/uploadCloud.middleware");

const controller = require("../controller/blog.controller");

router.get('/', controller.index);
router.post('/create', upload.single('img'), uploadCloud.upload, controller.createPost);
router.get('/edit/:id', controller.edit);
router.patch('/edit/:id', controller.editPatch);
router.delete('/deleteBlog/:id', controller.deleteBlog);
router.patch('/change-status/:status/:id', controller.changeStatus);
router.get('/detail/:id', controller.detail);

module.exports = router;