const { MongoClient } = require("mongodb");
require("dotenv").config();

const dbName = "data";

let db;
let dbConnectionString = process.env.DB_STRING;
let collection;

module.exports = {
  connectToServer: async function () {
    console.log("dbConnectionString:", dbConnectionString);
    try {
      MongoClient.connect(dbConnectionString).then((client) => {
        console.log(`Connected to the ${dbName} database`);
        db = client.db(dbName);
        collection = db.collection("");
        console.log("Successfully connected to MongoDB.");
        return db;
      });

    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      throw err;
    }
  },

  getDb: function () {
    if (!db) {
      throw new Error("Database not initialized. Call connectToServer first.");
    }
    return db;
  },
};
