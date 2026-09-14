const express = require("express");
const router = express.Router();
const cardController = require("../controllers/cardController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, cardController.getCards);
router.post("/", requireAuth, cardController.createCard);
router.put("/:id", requireAuth, cardController.updateCard);
router.delete("/:id", requireAuth, cardController.deleteCard);

module.exports = router;
