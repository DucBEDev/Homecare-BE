const express = require("express");
const router = express.Router();

const controller = require("../controller/auth.controller");

router.post('/login', controller.login);
router.get('/verify', controller.verify);
router.get('/logout', controller.logout);

module.exports = router;