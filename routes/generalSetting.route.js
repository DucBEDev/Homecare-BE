const express = require('express');
const router = express.Router();

const controller = require("../controller/generalSetting.controller");

router.get('/', controller.index);
router.post('/update', controller.update);

module.exports = router;