const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, transactionController.getTransactions);
router.post("/", requireAuth, transactionController.createTransaction);
router.put("/:id", requireAuth, transactionController.updateTransaction);
router.delete("/:id", requireAuth, transactionController.deleteTransaction);

module.exports = router;
