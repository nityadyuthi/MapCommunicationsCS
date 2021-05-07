require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

var multer = require("multer");
var upload = multer({
  dest: "uploads/",
});
var cpUpload = upload.fields([{ name: "avatar", maxCount: 8 }]);

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

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

var upload = multer({ storage: storage });

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

app.get("/", (req, res) => {
  res.redirect("user");
});

app.get("/user", (req, res) => {
  res.render("user", { data: 0, message: "" });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/supervisor", (req, res) => {
  if (isLoggedIn) {
    res.render("supervisor", { message: "" });
  }
  res.render("login");
});

app.post("/login", (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  if ((username = "admin" && password == "root")) {
    isLoggedIn = true;
    res.redirect("supervisor");
  }
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
            "Your query has been submitted. Our representatives will get back to you shortly. The request ID is:" +
            result.insertId,
          data: 1,
        });
      }
    }
  );
});

app.post("/supervisor", upload.array("file", 10), (req, res) => {
  console.log(req.files);
  let file = "";
  req.files.forEach((ele) => {
    var name = ele.filename.toString();
    file = file.concat(name);
  });
  res.render("supervisor", { message: "Uploaded successfully" });
});

app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
