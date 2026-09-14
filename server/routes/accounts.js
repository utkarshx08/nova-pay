const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, accountController.getAccounts);
router.post("/", requireAuth, accountController.createAccount);
router.put("/:id", requireAuth, accountController.updateAccount);
router.delete("/:id", requireAuth, accountController.deleteAccount);

module.exports = router;
