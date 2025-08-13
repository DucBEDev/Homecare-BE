const express = require('express');
const router = express.Router();

const controller = require("../controller/customer.controller");

router.get('/', controller.index);
router.get('/requestHistoryList/:phone', controller.requestHistoryList);
router.get('/checkExist/:cusPhone', controller.checkCusExist);

module.exports = router;