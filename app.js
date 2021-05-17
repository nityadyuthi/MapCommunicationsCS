require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const ejs = require("ejs");
let mysql = require("mysql");
var isLoggedIn = false;
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

const services = [
  {
    service: "Phone Answering Services",
    subservice: "24 Hour Answering Service",
    serviceUrl: "Phone-Answering-Services",
    subserviceUrl: "24-Hour-Answering-Service",
  },
  {
    service: "Phone Answering Services",
    subservice: "After Hours Answering Service",
    serviceUrl: "Phone-Answering-Services",
    subserviceUrl: "After-Hours-Answering-Service",
  },
];

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/home", (req, res) => {
  res.render("home");
});

app.get("/custRep", (req, res) => {
  res.render("custRep", { message: "" });
});

app.get("/login", (req, res) => {
  res.render("login", { message: "" });
});

app.get("/supervisor", (req, res) => {
  if (isLoggedIn) {
    res.render("supervisor", { services: services });
  }
  res.render("login", { message: "Please log in to view this page" });
});

app.get("/supervisor/:param1/:param2", (req, res) => {
  var service = req.params.param1;
  var ss = req.params.param2;
  var subservice = ss.replace(/-/g, " ");
  console.log(subservice);
  connection.query(
    "SELECT * FROM Requests WHERE SubService=" + connection.escape(subservice),
    (error, result) => {
      // console.log(result);
      res.render("services", { message: result });
    }
  );
});

app.post("/login", (req, res) => {
  var email = req.body.emailID;
  var password = req.body.password;
  connection.query(
    "SELECT * FROM Users WHERE EmailID=" +
      connection.escape(email) +
      "AND Password=" +
      connection.escape(password),
    (error, result) => {
      if (error) throw error;
      else {
        console.log(result);
        if (result.length == 0) {
          res.render("login", {
            message: "Wrong Email ID or Password. Please try again.",
          });
        } else {
          if (result[0].Type === "S") {
            isLoggedIn = true;
            res.render("supervisor", { services: services });
          } else if (result[0].Type === "CR") {
            isLoggedIn = true;
            res.render("custRep");
          }
        }
      }
    }
  );
});

app.post("/custRep", (req, res) => {
  var name = req.body.name;
  var email = req.body.email;
  var phno = req.body.phno;
  var company = req.body.company;
  var service = req.body.service;
  var subservice = req.body.subservice;
  var reqDesc = req.body.reqdesc;
  connection.query(
    "INSERT INTO Requests (Name, PhNo, EmailID, Company, Service, SubService, Request) VALUES (?)",
    [[name, phno, email, company, service, subservice, reqDesc]],
    (error, result) => {
      if (error) throw error;
      else {
        // await axios
        //   .post("/mlModelUrl", {
        //     requestID: result.insertId,
        //     requestText: reqDesc,
        //   })
        //   .then(function (response) {
        //     console.log(response);
        //     //TODO: 1. ID the top 3 sentiments. 2. Insert sentiments and classify as urgent/not.
        //   })
        //   .catch(function (error) {
        //     console.log(error);
        //   });
        // console.log(result.insertId);
        res.render("custRep", {
          message:
            "Your query has been submitted. Our representatives will get back to you shortly. The request ID is:" +
            result.insertId,
        });
      }
    }
  );
});

app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
