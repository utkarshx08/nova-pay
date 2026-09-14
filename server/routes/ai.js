const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { requireAuth } = require("../middleware/auth");

router.post("/", requireAuth, aiController.handleNovaAIChat);

module.exports = router;
