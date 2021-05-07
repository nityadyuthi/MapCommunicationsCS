require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
let mysql = require("mysql");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

let connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_UID,
  password: process.env.DB_PW,
  database: process.env.DB_UID,
});

connection.connect(function (err) {
  if (err) {
    return console.error("error: " + err.message);
  }
  console.log("Connected to the MySQL server.");
});

app.get("/user", (req, res) => {
  res.render("user", { data: 0, message: "" });
});

app.post("/user", (req, res) => {
  var name = req.body.name;
  var email = req.body.email;
  var phno = req.body.phno;
  var company = req.body.company;
  var service = req.body.service;
  var subservice = req.body.subservice;
  var reqdesc = req.body.reqdesc;
  connection.query(
    "INSERT INTO FormData (Name, PhNo, EmailID, Company, Service, SubService, Request) VALUES (?)",
    [[name, phno, email, company, service, subservice, reqdesc]],
    (error, result) => {
      if (error) throw error;
      else {
        console.log(result.insertId);
        res.render("user", {
          message:
            "Your query has been submitted. The request ID is:" +
            result.insertId,
          data: 1,
        });
      }
    }
  );
});

app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
