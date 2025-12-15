const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const cors = require("cors");
require("dotenv").config();

// controllers
const restaurantsController = require("./api/restaurants/restaurantsController");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use(`/api/restaurants`, restaurantsController);

db.connectToServer()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Could not start server:", err);
    process.exit(1); // Exit if DB connection fails
  });
