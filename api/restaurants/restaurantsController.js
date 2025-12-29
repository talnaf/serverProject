const express = require("express");
const multer = require("multer");
const { ObjectId } = require("mongodb");
const db = require("../../db"); // Import the db functions

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

/**
 * GET /
 * Retrieves a list of restaurants from the database with optional pagination.
 *
 * @route GET /
 * @param {number} req.query.page - Page number (default: 1)
 * @param {number} req.query.limit - Number of results per page (default: 50, max: 100)
 * @returns {Object} 200 - Paginated results with metadata
 * @returns {Object} 500 - Internal server error
 */
router.get("/", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("restaurants");

    // Extract pagination parameters
    const { page = 1, limit = 50 } = req.query;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 results per page
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const results = await collection
      .find({})
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // Get total count for pagination metadata
    const totalCount = await collection.countDocuments({});
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).send({
      restaurants: results,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalResults: totalCount,
        resultsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch restaurants", details: error.message });
  }
});

/**
 * GET /search
 * Searches and retrieves restaurants with query filters and pagination.
 *
 * @route GET /search
 * @param {string} req.query.field - Field to search in (name, cuisine, address)
 * @param {string} req.query.query - Search term (case-insensitive partial match)
 * @param {number} req.query.page - Page number (default: 1)
 * @param {number} req.query.limit - Number of results per page (default: 10, max: 100)
 * @param {string} req.query.sortBy - Field to sort by (default: "name")
 * @param {string} req.query.sortOrder - Sort order: "asc" or "desc" (default: "asc")
 * @returns {Object} 200 - Paginated results with metadata
 * @returns {Object} 400 - Bad request if field is invalid
 * @returns {Object} 500 - Internal server error
 */
router.get("/search", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("restaurants");

    // Extract query parameters
    const { field, query, page = 1, limit = 10, sortBy = "name", sortOrder = "asc" } = req.query;

    // Build query filter
    const filter = {};

    if (field && query) {
      // Validate field to prevent injection
      const allowedFields = ["name", "cuisine", "address"];
      if (!allowedFields.includes(field)) {
        return res.status(400).send({
          error: "Invalid field parameter",
          message: `Field must be one of: ${allowedFields.join(", ")}`
        });
      }

      // Add regex search for the specified field
      filter[field] = { $regex: query, $options: "i" }; // Case-insensitive partial match
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 results per page
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const results = await collection
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // Get total count for pagination metadata
    const totalCount = await collection.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).send({
      restaurants: results,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalResults: totalCount,
        resultsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to search restaurants", details: error.message });
  }
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

/**
 * POST /:id/picture
 * Uploads a picture for a restaurant and stores it in MongoDB GridFS.
 * The picture is stored in chunks and the file ID is saved to the restaurant document.
 *
 * @route POST /:id/picture
 * @param {string} req.params.id - The MongoDB ObjectId of the restaurant
 * @param {File} req.file - The image file to upload (multipart/form-data with field name "picture")
 * @returns {Object} 200 - Success response with file ID
 * @returns {Object} 400 - Bad request if restaurant ID or file is invalid
 * @returns {Object} 404 - Restaurant not found
 * @returns {Object} 500 - Internal server error
 */
router.post("/:id/picture", upload.single("picture"), async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("restaurants");
    const bucket = db.getBucket();

    // Validate ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send({ error: "Invalid restaurant ID format" });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).send({ error: "No image file provided" });
    }

    // Check if restaurant exists
    const restaurant = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!restaurant) {
      return res.status(404).send({ error: "Restaurant not found" });
    }

    // Delete old picture if exists
    if (restaurant.pictureId) {
      try {
        await bucket.delete(new ObjectId(restaurant.pictureId));
      } catch (err) {
        console.log("Old picture not found or already deleted");
      }
    }

    // Upload new picture to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        restaurantId: req.params.id,
        uploadDate: new Date()
      }
    });

    // Write the buffer to GridFS
    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", async () => {
      // Update restaurant document with picture file ID
      await collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { pictureId: uploadStream.id } }
      );

      res.status(200).send({
        message: "Picture uploaded successfully",
        fileId: uploadStream.id,
        filename: req.file.originalname
      });
    });

    uploadStream.on("error", (error) => {
      res.status(500).send({ error: "Failed to upload picture", details: error.message });
    });

  } catch (error) {
    res.status(500).send({ error: "Failed to upload picture", details: error.message });
  }
});

/**
 * GET /:id/picture
 * Retrieves the picture for a restaurant from MongoDB GridFS.
 *
 * @route GET /:id/picture
 * @param {string} req.params.id - The MongoDB ObjectId of the restaurant
 * @returns {Stream} The image file as a binary stream
 * @returns {Object} 400 - Bad request if restaurant ID is invalid
 * @returns {Object} 404 - Restaurant or picture not found
 * @returns {Object} 500 - Internal server error
 */
router.get("/:id/picture", async (req, res) => {
  try {
    const database = db.getDb();
    const collection = await database.collection("restaurants");
    const bucket = db.getBucket();

    // Validate ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send({ error: "Invalid restaurant ID format" });
    }

    // Find restaurant and get picture ID
    const restaurant = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!restaurant) {
      return res.status(404).send({ error: "Restaurant not found" });
    }

    if (!restaurant.pictureId) {
      return res.status(404).send({ error: "Restaurant has no picture" });
    }

    // Stream the picture from GridFS
    const downloadStream = bucket.openDownloadStream(new ObjectId(restaurant.pictureId));

    // Get file info for content type
    const files = await bucket.find({ _id: new ObjectId(restaurant.pictureId) }).toArray();
    if (files.length === 0) {
      return res.status(404).send({ error: "Picture file not found" });
    }

    res.set("Content-Type", files[0].contentType || "image/jpeg");

    downloadStream.on("error", () => {
      res.status(404).send({ error: "Picture not found" });
    });

    downloadStream.pipe(res);

  } catch (error) {
    res.status(500).send({ error: "Failed to retrieve picture", details: error.message });
  }
});

module.exports = router;
