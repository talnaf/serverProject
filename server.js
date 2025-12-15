const express = require("express");
const app = express();
const cors = require("cors");
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

let db,
  dbConnectionString = process.env.DB_STRING,
  dbName = "sample_analytics",
  collection;

MongoClient.connect(dbConnectionString).then((client) => {
  console.log(`Connected to the ${dbName} database`);
  db = client.db(dbName);
  collection = db.collection("");
});

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(cors())

app.listen(process.env.PORT || PORT, () => {
  console.log(`Go catch the server at PORT ${process.env.PORT || PORT}`);
});
