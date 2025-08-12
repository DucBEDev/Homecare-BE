const express = require("express");
const router = express.Router();

const controller = require("../controller/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post('/login', controller.login);
router.get('/validate', authMiddleware.auth, controller.validate);
router.get('/logout', controller.logout);

module.exports = router;