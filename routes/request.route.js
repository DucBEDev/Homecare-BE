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
router.get('/detail/history/:requestDetailId', controller.history);
router.patch('/detail/assignFullRequest', controller.assignFullRequest);
router.patch('/detail/assignSubRequest/:requestDetailId', controller.assignSubRequest);
router.patch('/detail/cancel/:requestDetailId', controller.cancel);
router.patch('/detail/changeTime/:requestDetailId', controller.changeTime);
router.patch('/updateRequestDone/:requestId', controller.updateRequestDonePatch);
router.patch('/updateDetailWaitPayment/:requestDetailId', controller.updateRequestWaitPaymentPatch);
router.patch('/updateRequestDetailDone/:requestDetailId', controller.updateRequestDetailDonePatch);
router.get('/updateRequestDetailDone/:requestDetailId', controller.updateRequestDetailDone);

module.exports = router;