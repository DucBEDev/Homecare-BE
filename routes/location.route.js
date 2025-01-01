const express = require("express");
const router = express.Router();

const controller = require("../controller/location.controller");
const validate = require("../validates/location.validate");

router.get("/", controller.index);

module.exports = router;