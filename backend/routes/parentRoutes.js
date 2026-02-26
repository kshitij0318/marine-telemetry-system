const express = require("express");
const router = express.Router();
const parentController = require("../controllers/parentController");

router.get("/", parentController.getAllVessels);
router.get("/:vesselId", parentController.getParentState);

module.exports = router;