const express = require("express");
const router = express.Router();

const controller = require("../controller/location.controller");
const validate = require("../validates/location.validate");

router.get("/province", controller.getProvinces);
router.get("/province/:provinceId/districts", controller.getDistrictsByProvince);
router.get("/province/:provinceId/districts/:districtId/wards", controller.getWardsByDistrict);

module.exports = router;