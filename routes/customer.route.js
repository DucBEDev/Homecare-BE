const express = require('express');
const router = express.Router();

const controller = require("../controller/customer.controller");

router.get('/', controller.index);
router.get('/requestHistoryList/:phone', controller.requestHistoryList);
router.get('/checkExist/:cusPhone', controller.checkCusExist);
router.get('/detail/:cusPhone', controller.customerDetail);

module.exports = router;