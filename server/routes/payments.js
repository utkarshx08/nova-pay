const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, paymentController.getPayments);
router.post("/", requireAuth, paymentController.createPayment);
router.put("/:id", requireAuth, paymentController.updatePayment);
router.delete("/:id", requireAuth, paymentController.deletePayment);

module.exports = router;
