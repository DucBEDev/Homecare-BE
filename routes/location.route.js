const express = require("express");
const router = express.Router();

const controller = require("../controller/location.controller");
const validate = require("../validates/location.validate");

router.get("/", controller.index);
router.get("/fetch", controller.fetchData);
router.get("/createProvince", controller.createProvince);
router.post("/createProvince", validate.createProvincePost, controller.createProvincePost);
router.get("/createDistrict", controller.createDistrict);
router.post("/createDistrict", validate.createDistrictPost, controller.createDistrictPost);
router.delete("/deleteProvince/:id", controller.deleteProvince);
router.delete("/deleteDistrict/:id/:districtId", controller.deleteDistrict);

module.exports = router;