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

var serviceData = [
  {
    service: "Phone Answering Services",
    subservice: "24 Hour Answering Service",
  },
  {
    service: "Phone Answering Services",
    subservice: "After Hours Answering Service",
  },
  {
    service: "Phone Answering Services",
    subservice: "Bilingual Answering Service",
  },
  {
    service: "Phone Answering Services",
    subservice: "Call Overflow Answering Service",
  },
  {
    service: "Phone Answering Services",
    subservice: "Message Dispatch Service",
  },
  {
    service: "Phone Answering Services",
    subservice: "On-Call Answering Service",
  },
  {
    service: "Phone Answering Services",
    subservice: "RSVP Answering Service",
  },
];

let connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_UID,
  // port: 8000,
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
  res.render("custRep", { message: "", serviceData: serviceData });
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
          // res.render("supervisor", { result: result });
          // res.redirect("supervisor");
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
      console.log(result);
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

// app.get("/editRequest/:rid", (req, res) => {
//   console.log(req.params.rid);
//   connection.query(
//     "SELECT * FROM Requests WHERE RequestID=" +
//       connection.escape(req.params.rid),
//     (error, result) => {
//       if (error) throw error;
//       else {
//         console.log(result);
//         res.render("editRequest", { reqData: result });
//       }
//     }
//   );
// });

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
    var userIDTwitter = [];
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < 6; i++) {
      userIDTwitter.push(
        characters.charAt(Math.floor(Math.random() * charactersLength))
      );
    }
    userIDTwitter = userIDTwitter.join("");
    console.log(userIDTwitter);

    var tweetID = Math.floor(100000 + Math.random() * 900000);

    await axios
      .post("/https://sa-rocket.herokuapp.com/", {
        id: userIDTwitter,
        text: requestText,
      })
      .then(function (response) {
        //TODO: get the 3 emotions and insert it acc to req id.
        var mainEmotion = Object.keys(response)[0];
        console.log(response);
        // connection.query(
        //   "UPDATE Requests SET Decision=" +
        //     connection.escape(decision) +
        //     "WHERE RequestID=" +
        //     connection.escape(requestID),
        //   (error, result) => {
        //     if (error) throw error;
        //     else {
        //       console.log(result);
        //     }
        //   }
        // );
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
        modelPostReq(reqDesc);

        console.log(result.insertId);
        res.render("custRep", {
          message:
            "Your query has been submitted. Our representatives will get back to you shortly. The request ID is:" +
            result.insertId,
        });
      }
    }
  );
});

// app.post("/editRequest/:rid", (req, res) => {
//   var updatedDecision = req.body.decision;
//   var reqID = req.params.rid;
//   connection.query(
//     "UPDATE Requests SET Decision=" +
//       connection.escape(updatedDecision) +
//       " WHERE RequestID=" +
//       connection.escape(reqID),
//     (error, result) => {
//       if (error) throw error;
//       else {
//         connection.query(
//           "SELECT Service, SubService FROM Requests WHERE RequestID=" +
//             connection.escape(reqID),
//           (error, result1) => {
//             if (error) throw error;
//             else {
//               var service = result1[0].Service.replace(
//                 / +/g,
//                 "-"
//               ).toLowerCase();
//               var subservice = result1[0].SubService.replace(
//                 / +/g,
//                 "-"
//               ).toLowerCase();
//               res.redirect("/supervisor/" + service + "/" + subservice);
//             }
//           }
//         );
//       }
//     }
//   );
// });

app.post("/supervisor/:service", (req, res) => {
  var s1 = req.params.service.replace(/-/g, " ");
  service = s1.toProperCase();
  console.log(service);
  connection.query(
    "SELECT * FROM Requests WHERE Service=" + connection.escape(service),
    (error, result) => {
      console.log(result);
      res.render("requests", { message: result });
    }
  );
});

app.post("/supervisor/:service/:subservice", (req, res) => {
  service = req.params.service;
  subservice = req.params.subservice;
  var requestID = req.body.requestID;
  connection.query("INSERT INTO RetrainData() VALUES()", (error, result) => {
    if (error) throw error;
    else {
      res.redirect("/supervisor/" + service + "/" + subservice);
    }
  });
});

app.get("/retrain", (req, res) => {
  //TODO: what data is req for retraining and in what format
  axios.get("https://sa-rocket.herokuapp.com/retrain/");
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server is running");
});
