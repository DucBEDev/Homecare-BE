const express = require('express');
const router = express.Router();

const controller = require("../controller/dashboard.controller")

router.get('/', controller.dashboard);
router.get('/chart', controller.revenueTimeline);

module.exports = router;