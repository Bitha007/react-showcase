require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Token = require("../models/tokenModel");

//check the user from database
function verifyUser(req, res, next) {
  console.log(req.body);
  User.findOne(
    { email: req.body.email, password: req.body.password },
    (err, docs) => {
      if (err) {
        res.status(201).send("Error loding the data");
      } else if (docs === null) {
        res.status(201).send({
          isVerified: false,
          message: "Email not found."
        });
      } else if (!docs.isVerified) {
        console.log(docs.isVerified);
        return res.status(401).send({
          isVerified: false,
          message: "Your account has not been verified."
        });
      } else {
        req.userdoc = docs;
        console.log(docs);
        next();
      }
    }
  );
}
function resendToken(req, res, next) {
  User.find({ email: req.body.email }, function(err, user) {
    if (!user)
      return res
        .status(400)
        .send({ msg: "We were unable to find a user with that email." });
    else {
      if (user.isVerified)
        return res.status(400).send({
          msg: "This account has already been verified. Please log in."
        });
      else {
        console.log(user._id);
        req._id = user._id;
        next();
      }
    }
  });
}
function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
//Check Weather the user email is in database or not
function checkIsEmailUnique(req, res, next) {
  const email = req.body.email;
  if (validateEmail(email)) {
    User.find({ email }, (err, docs) => {
      if (err) {
        res.status(201).send("Error loding the data");
      } else if (docs.length === 0 || docs === null) {
        next();
      } else {
        res.status(201).send({
          message: "Email is already taken"
        });
      }
    });
  } else {
    res.status(201).send({
      message: "Email is invalid"
    });
  }
}

//it generate token using jwt with secrectkey
function generateJwt(req, res, next) {
  const user = {
    email: req.body.email,
    password: req.body.password
  };
  jwt.sign(
    { user: user },
    process.env.PUBLIC_KEY,
    { expiresIn: "10h" },
    (err, token) => {
      res.json({
        message: "Sucessfully token generated.",
        token: token,
        user: req.userdoc
      });
    }
  );
}

//Check the token is verified or not of jwt
function verifyJwt(req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.PUBLIC_KEY, (err, decoded) => {
      //TODO: manage if/else statement
      if (err) {
        console.log("error verifyJwt");
        res.status(201).send({
          message: "Unauthorized access"
        });
      } else {
        console.log("Token Valid", decoded);
        req.body.email = decoded.user.email;
        req.body.password = decoded.user.password;
        next();
      }
    });
  } catch (e) {
    console.log("Toekn not found");
    res.status(201).send({
      message: "Unauthorized access"
    });
  }
}

// add user to the datbase
function addUser(req, res, next) {
  //TODO: add the created date and active field active is false by default
  console.log("addUser is running");
  const user = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    profileURL: req.body.profileURL
  };
  var newUser = new User(user);
  newUser
    .save()
    .then(() => {
      req._id = newUser._id;
      console.log("User added to the database");
      next();
    })
    .catch(e => res.status(201).send(e));
}

function verifyToken(req, res, next) {
  Token.findOne({ token: req.query.token }, (err, token) => {
    console.log("token: ", token);
    if (token) {
      User.findOne({ _id: token._userId }, (err, user) => {
        console.log("User:", user);
        user.isVerified = true;
        user.save(function(err) {
          if (err) {
            return res.status(500).send({ msg: err.message });
          }
          res.status(200).send({
            isVerified: true,
            message: "Account has been verified"
          });
        });
      });
    } else {
      res.send({
        isVerified: false,
        message: "Token Error"
      });
    }
  });
}

module.exports = {
  verifyUser: verifyUser,
  generateJwt: generateJwt,
  checkIsEmailUnique: checkIsEmailUnique,
  addUser: addUser,
  verifyJwt: verifyJwt,
  resendToken: resendToken,
  verifyToken: verifyToken
};
