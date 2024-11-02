const express = require('express');
const router = express.Router();

const controller = require("../controller/timeOff.controller");

router.get('/:helperId', controller.index);
router.get('/detailSchedule/:helperId/:chosenDate', controller.detailSchedule);
router.post('/createDateOff', controller.createDateOff);

module.exports = router;