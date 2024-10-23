const express = require('express');
const router = express.Router();

const controller = require("../controller/request.controller")

router.get('/', controller.index);
router.get('/create', controller.create);
router.post('/create', controller.createPost);
router.delete('/delete/:id', controller.deleteItem);
router.get('/edit/:id', controller.edit);
router.patch('/edit/:id', controller.editPatch);
router.get('/detail/:id', controller.detail);
router.patch('/updateHelperToRequestDetails/:requestId', controller.updateHelperToRequestDetails);
router.get('/updateRequestDone/:requestId', controller.updateRequestDone);
router.patch('/updateRequestDone/:requestId', controller.updateRequestDonePatch);

module.exports = router;