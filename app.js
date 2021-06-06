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

String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

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
    connection.query(
      "SELECT SubService, COUNT(*) FROM Requests GROUP BY SubService",
      (error, result) => {
        if (error) throw error;
        else {
          console.log(result);
        }
      }
    );
    res.render("supervisor");
  }
  res.render("login", { message: "Please log in to view this page" });
});

app.get("/supervisor/:service", (req, res) => {
  var s1 = req.params.service.replace(/-/g, " ");
  service = s1.toProperCase();
  console.log(service);
  connection.query(
    "SELECT * FROM Requests WHERE Service=" + connection.escape(service),
    (error, result) => {
      res.render("requests", { message: result });
    }
  );
});

app.get("/supervisor/:service/:subservice", (req, res) => {
  var s1 = req.params.service.replace(/-/g, " ");
  service = s1.toProperCase();

  var ss1 = req.params.subservice.replace(/-/g, " ");
  subservice = ss1.toProperCase();

  console.log(service, subservice);
  connection.query(
    "SELECT * FROM Requests WHERE SubService=" +
      connection.escape(subservice) +
      "AND Service=" +
      connection.escape(service),
    (error, result) => {
      console.log(result);
      res.render("requests", { message: result });
    }
  );
});

app.get("/logout", (req, res) => {
  isLoggedIn = false;
  res.redirect("home");
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
        console.log("logged in.");
        if (result.length == 0) {
          res.render("login", {
            message: "Wrong Email ID or Password. Please try again.",
          });
        } else {
          if (result[0].Type === "S") {
            isLoggedIn = true;
            res.redirect("supervisor");
          } else if (result[0].Type === "CR") {
            isLoggedIn = true;
            res.redirect("custRep");
          }
        }
      }
    }
  );
});

async function modelPostReq(requestText, requestID) {
  try {
    await axios
      .post("https://sa-rocket2.herokuapp.com/predict", {
        text: requestText,
      })
      .then(function (response) {
        var count = 0;
        var urgent = "not urgent";
        var negSentiments = ["hate", "anger", "sadness", "worry", "boredom"];

        var res = Object.keys(response.data).reduce(function (a, b) {
          return response.data[a] > response.data[b] ? a : b;
        });

        Object.keys(response.data).forEach((key) => {
          negSentiments.forEach((senti) => {
            if (senti === key) count++;
          });
        });

        if (count >= 2) {
          urgent = "urgent";
        }

        connection.query(
          "UPDATE Requests SET Sentiment=" +
            connection.escape(JSON.stringify(response.data)) +
            ", TopSentiment=" +
            connection.escape(res) +
            ", Flag=" +
            connection.escape(urgent) +
            "WHERE RequestID=" +
            connection.escape(requestID),
          (error, result) => {
            if (error) throw error;
            else {
              console.log(
                "updated the requests table with seniment analysis data."
              );
            }
          }
        );
      })
      .catch(function (error) {
        console.log(error);
      });
  } catch (err) {
    console.log(err);
  }
}
app.post("/custRep", (req, res) => {
  var service = req.body.service;
  var subservice = req.body.subservice;
  var reqDesc = req.body.reqdesc;
  connection.query(
    "INSERT INTO Requests (Service, SubService, Request) VALUES (?)",
    [[service, subservice, reqDesc]],
    (error, result) => {
      if (error) throw error;
      else {
        modelPostReq(reqDesc, result.insertId);
        res.render("custRep", {
          message:
            "Your query has been submitted. Our representatives will get back to you shortly. The request ID is: " +
            result.insertId,
        });
      }
    }
  );
});

app.post("/supervisor/:service", (req, res) => {
  var service = req.params.service;
  var reqText = req.body.reqText;
  var newEmotion = req.body.changeEmotion;
  var urgency = req.body.urgent;
  var reqID = req.body.requestID;
  var author = [];
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < 6; i++) {
    author.push(
      characters.charAt(Math.floor(Math.random() * charactersLength))
    );
  }
  author = author.join("");
  console.log(author);

  var id = Math.floor(100000 + Math.random() * 900000);

  var sentiment = req.body.changeEmotion;
  console.log(id, sentiment, author, reqText);

  connection.query(
    "INSERT INTO RetrainData(tweet_id, sentiment, author, content) VALUES(?)",
    [[id, sentiment, author, reqText]],
    (error, result) => {
      if (error) throw error;
      else {
        connection.query(
          "UPDATE Requests SET TopSentiment=" +
            connection.escape(newEmotion) +
            ", Flag=" +
            connection.escape(urgency) +
            "WHERE RequestID=" +
            connection.escape(reqID),
          (error, result1) => {
            if (error) throw error;
            else {
              console.log(
                "updated requests table with correct sentiment.redirecting back to service page"
              );
              res.redirect("/supervisor/" + service);
            }
          }
        );
      }
    }
  );
});

app.post("/supervisor/:service/:subservice", (req, res) => {
  var service = req.params.service;
  var subservice = req.params.subservice;
  var reqText = req.body.reqText;

  var author = [];
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < 6; i++) {
    author.push(
      characters.charAt(Math.floor(Math.random() * charactersLength))
    );
  }
  author = author.join("");
  console.log(author);

  var id = Math.floor(100000 + Math.random() * 900000);

  var sentiment = req.body.changeEmotion;
  console.log(id, sentiment, author, reqText);

  connection.query(
    "INSERT INTO RetrainData(tweet_id, sentiment, author, content) VALUES(?)",
    [[id, sentiment, author, reqText]],
    (error, result) => {
      if (error) throw error;
      else {
        connection.query(
          "UPDATE Requests SET TopSentiment=" +
            connection.escape(req.body.changeEmotion) +
            ", Flag=" +
            connection.escape(req.body.urgent) +
            "WHERE RequestID=" +
            connection.escape(req.body.requestID),
          (error, result1) => {
            if (error) throw error;
            else {
              console.log(
                "updated requests table with correct sentiment.redirecting back to service page"
              );
              res.redirect("/supervisor/" + service + "/" + subservice);
            }
          }
        );
      }
    }
  );
});

app.get("/retrain", (req, res) => {
  //TODO: what data is req for retraining and in what format
  axios.get("https://sa-rocket.herokuapp.com/retrain/");
  isLoggedIn = true;
  console.log("model is retraining data. redirecting to supervisor page");
  res.redirect("/supervisor");
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server is running");
});
