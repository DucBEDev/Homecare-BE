const express = require("express");
const router = express.Router();

const controller = require("../controller/export.controller");

router.get("/data", controller.exportData);

module.exports = router;