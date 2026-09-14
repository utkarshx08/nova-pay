const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, budgetController.getBudgets);
router.post("/", requireAuth, budgetController.createBudget);
router.put("/:id", requireAuth, budgetController.updateBudget);
router.delete("/:id", requireAuth, budgetController.deleteBudget);

module.exports = router;
