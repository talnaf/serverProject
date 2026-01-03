const express = require("express");
const { ObjectId } = require("mongodb");
const db = require("../../db");

const router = express.Router();

/**
 * POST /
 * Creates a new user in the database.
 *
 * @route POST /
 * @param {Object} req.body - The user data to create
 * @param {string} req.body.uid - Firebase user ID (required)
 * @param {string} req.body.email - User email (required)
 * @param {string} req.body.name - User name (required)
 * @param {string} req.body.role - User role: "user" or "manager" (required)
 * @returns {Object} 201 - Success response with created user ID
 * @returns {Object} 400 - Bad request if required fields are missing
 * @returns {Object} 500 - Internal server error
 */
router.post("/", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("users");

    const { uid, email, name, role, isEmailVerified } = req.body;

    // Validate required fields
    if (!uid || !email || !name || !role) {
      return res.status(400).send({
        error: "Missing required fields",
        message: "uid, email, name, and role are required"
      });
    }

    // Validate role
    if (!["user", "restaurantOwner"].includes(role)) {
      return res.status(400).send({
        error: "Invalid role",
        message: "Role must be either 'user' or 'restaurantOwner'"
      });
    }

    // Check if user already exists
    const existingUser = await collection.findOne({ uid });
    if (existingUser) {
      return res.status(409).send({
        error: "User already exists",
        message: "A user with this Firebase UID already exists"
      });
    }

    // Create new user document
    const newUser = {
      uid,
      email,
      name,
      role,
      isEmailVerified: isEmailVerified || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newUser);

    res.status(201).send({
      message: "User created successfully",
      userId: result.insertedId,
      user: newUser
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to create user", details: error.message });
  }
});

/**
 * GET /uid/:uid
 * Retrieves a user by their Firebase UID.
 *
 * @route GET /uid/:uid
 * @param {string} req.params.uid - The Firebase UID of the user
 * @returns {Object} 200 - User data
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Internal server error
 */
router.get("/uid/:uid", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("users");

    const user = await collection.findOne({ uid: req.params.uid });

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    res.status(200).send({ user });
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch user", details: error.message });
  }
});

/**
 * GET /
 * Retrieves all users from the database.
 *
 * @route GET /
 * @returns {Object} 200 - Array of users
 * @returns {Object} 500 - Internal server error
 */
router.get("/", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("users");

    const users = await collection.find({}).toArray();

    res.status(200).send({ users });
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch users", details: error.message });
  }
});

/**
 * PATCH /uid/:uid
 * Updates an existing user in the database.
 *
 * @route PATCH /uid/:uid
 * @param {string} req.params.uid - The Firebase UID of the user to update
 * @param {Object} req.body - The fields to update in the user document
 * @returns {Object} 200 - Success response with update result
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Internal server error
 */
router.patch("/uid/:uid", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("users");

    const updates = {
      ...req.body,
      updatedAt: new Date()
    };

    // Remove uid from updates to prevent changing it
    delete updates.uid;

    const result = await collection.updateOne(
      { uid: req.params.uid },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "User not found" });
    }

    res.status(200).send({
      message: "User updated successfully",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to update user", details: error.message });
  }
});

/**
 * PATCH /uid/:uid/verify-email
 * Updates the email verification status for a user.
 *
 * @route PATCH /uid/:uid/verify-email
 * @param {string} req.params.uid - The Firebase UID of the user
 * @param {Object} req.body - The verification status
 * @param {boolean} req.body.isEmailVerified - The email verification status
 * @returns {Object} 200 - Success response
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Internal server error
 */
router.patch("/uid/:uid/verify-email", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("users");

    const { isEmailVerified } = req.body;

    const result = await collection.updateOne(
      { uid: req.params.uid },
      {
        $set: {
          isEmailVerified: isEmailVerified,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "User not found" });
    }

    res.status(200).send({
      message: "Email verification status updated successfully",
      isEmailVerified: isEmailVerified
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to update email verification status", details: error.message });
  }
});

/**
 * DELETE /uid/:uid
 * Deletes a user from the database.
 *
 * @route DELETE /uid/:uid
 * @param {string} req.params.uid - The Firebase UID of the user to delete
 * @returns {Object} 200 - Success response confirming deletion
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Internal server error
 */
router.delete("/uid/:uid", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("users");

    const result = await collection.deleteOne({ uid: req.params.uid });

    if (result.deletedCount === 0) {
      return res.status(404).send({ error: "User not found" });
    }

    res.status(200).send({
      message: "User deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to delete user", details: error.message });
  }
});

module.exports = router;
