const express = require('express');
const router = express.Router();

// Connect Multer library to upload images
const multer = require('multer');
const upload = multer();
const uploadCloud = require("../middlewares/uploadCloud.middleware");

const controller = require("../controller/helper.controller");

router.get('/', controller.index);
router.get('/create', controller.create);
router.post('/create', upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'healthCertificates', maxCount: 5 } ]), 
uploadCloud.upload, controller.createPost);
router.patch('/change-multi', controller.changeMulti);
router.patch('/change-status/:status/:id', controller.changeStatus);
router.delete('/delete/:id', controller.deleteItem);
router.get('/detail/:id', controller.detail);
router.get('/edit/:id', controller.edit);
router.patch('/edit/:id', upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'healthCertificates', maxCount: 5 } ]), 
uploadCloud.upload, controller.editPatch);

module.exports = router;