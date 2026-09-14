const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth } = require("../middleware/auth");

router.put("/profile", requireAuth, userController.updateProfile);

module.exports = router;
