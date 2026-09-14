const express = require("express");
const router = express.Router();
const goalController = require("../controllers/goalController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, goalController.getGoals);
router.post("/", requireAuth, goalController.createGoal);
router.put("/:id", requireAuth, goalController.updateGoal);
router.delete("/:id", requireAuth, goalController.deleteGoal);

module.exports = router;
