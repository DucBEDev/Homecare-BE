const express = require("express");
const router = express.Router();

const controller = require("../controller/location.controller");
const validate = require("../validates/location.validate");

router.get("/province", controller.getProvinces);
router.get("/ward/:provinceId", controller.getWardsByProvince);

module.exports = router;