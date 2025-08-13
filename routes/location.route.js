const express = require("express");
const router = express.Router();

const controller = require("../controller/location.controller");
const validate = require("../validates/location.validate");

router.get("/province", controller.getProvinces);
router.get("/district/:provinceId", controller.getDistrictsByProvince);
router.get("/ward/:provinceId/:districtId", controller.getWardsByDistrict);

module.exports = router;