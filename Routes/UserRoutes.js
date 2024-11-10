const express = require("express");
const router = express.Router();

const UserCntrl = require("../Controllers/UserCntrl")

router.post("/signup",UserCntrl.signup);
router.post("/login",UserCntrl.login);
router.post("/logout",UserCntrl.logout);

module.exports = router;