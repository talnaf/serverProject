const express = require("express");
const db = require("../../db"); // Import the db functions

const router = express.Router();

/**
 * GET /
 * Retrieves a list of restaurants from the database.
 *
 * @route GET /
 * @returns {Array} An array of up to 50 restaurant documents
 * @returns {Object} 200 - Success response with restaurant data
 */
router.get("/", async (req, res) => {
  const database = db.getDb();
  let collection = await database.collection("restaurants");
  let results = await collection.find({}).limit(50).toArray();
  res.send(results).status(200);
});

/**
 * POST /
 * Creates a new restaurant in the database.
 *
 * @route POST /
 * @param {Object} req.body - The restaurant data to create
 * @param {string} req.body.name - Restaurant name (required)
 * @param {string} req.body.cuisine - Type of cuisine (required)
 * @returns {Object} 201 - Success response with created restaurant ID
 * @returns {Object} 400 - Bad request if required fields are missing
 * @returns {Object} 500 - Internal server error
 */
router.post("/", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("restaurants");

    const newRestaurant = req.body;

    const result = await collection.insertOne(newRestaurant);

    res.status(201).send({
      message: "Restaurant created successfully",
      restaurantId: result.insertedId
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to create restaurant", details: error.message });
  }
});

/**
 * PATCH /:id
 * Updates an existing restaurant in the database.
 *
 * @route PATCH /:id
 * @param {string} req.params.id - The MongoDB ObjectId of the restaurant to update
 * @param {Object} req.body - The fields to update in the restaurant document
 * @returns {Object} 200 - Success response with update result
 * @returns {Object} 400 - Bad request if restaurant ID is invalid
 * @returns {Object} 404 - Restaurant not found
 * @returns {Object} 500 - Internal server error
 */
router.patch("/:id", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("restaurants");
    const { ObjectId } = require("mongodb");

    // Validate ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send({ error: "Invalid restaurant ID format" });
    }

    const query = { _id: new ObjectId(req.params.id) };
    const updates = { $set: req.body };

    const result = await collection.updateOne(query, updates);

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Restaurant not found" });
    }

    res.status(200).send({
      message: "Restaurant updated successfully",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to update restaurant", details: error.message });
  }
});

/**
 * DELETE /:id
 * Deletes a restaurant from the database.
 *
 * @route DELETE /:id
 * @param {string} req.params.id - The MongoDB ObjectId of the restaurant to delete
 * @returns {Object} 200 - Success response confirming deletion
 * @returns {Object} 400 - Bad request if restaurant ID is invalid
 * @returns {Object} 404 - Restaurant not found
 * @returns {Object} 500 - Internal server error
 */
router.delete("/:id", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("restaurants");
    const { ObjectId } = require("mongodb");

    // Validate ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send({ error: "Invalid restaurant ID format" });
    }

    const query = { _id: new ObjectId(req.params.id) };
    const result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).send({ error: "Restaurant not found" });
    }

    res.status(200).send({
      message: "Restaurant deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to delete restaurant", details: error.message });
  }
});

module.exports = router;
