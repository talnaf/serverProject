const express = require("express");
const db = require("../../db"); // Import the db functions

const router = express.Router();

router.get("/", async (req, res) => {
  const database = db.getDb();
  let collection = await database.collection("restaurants");
  let results = await collection.find({}).limit(50).toArray();
  res.send(results).status(200);
});

module.exports = router;
