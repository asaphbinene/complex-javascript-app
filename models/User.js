const bcrypt = require("bcryptjs");
const usersCollection = require("../db").db().collection("users");
const validator = require("validator");
const katbinMd5 = require("md5");

let User = function (data, getAvatar) {
  this.data = data;
  this.errors = [];
  if (getAvatar == undefined) {
    getAvatar = false;
  }
  if (getAvatar) {
    this.getAvatar();
  }
};

User.prototype.cleanUp = function () {
  if (typeof this.data.username != "string") {
    this.data.username = "";
  }
  if (typeof this.data.email != "string") {
    this.data.email = "";
  }
  if (typeof this.data.password != "string") {
    this.data.password = "";
  }

  // Getting rid of any fake properties
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password,
  };
};

User.prototype.validate = function () {
  return new Promise(async (resolve, reject) => {
    if (this.data.username == "") {
      this.errors.push("You must provide a username.");
    }
    if (
      this.data.username !== "" &&
      !validator.isAlphanumeric(this.data.username)
    ) {
      this.errors.push(
        "You must provide a valid username no special character."
      );
    }
    if (!validator.isEmail(this.data.email)) {
      this.errors.push("You must privide a valid email");
    }
    if (this.data.password == "") {
      this.errors.push("You must provide a password.");
    }
    if (this.data.password.length > 0 && this.data.password.length < 12) {
      this.errors.push("Password to short, atleast 12 and not more then 30");
    }
    if (this.data.password.length > 50) {
      this.errors.push("Password cannot exceed, 100 characters");
    }
    if (this.data.username.length > 0 && this.data.username.length < 3) {
      this.errors.push("Username to short!");
    }
    if (this.data.username.length > 30) {
      this.errors.push("Username cannot exceed 30 characters");
    }

    //Verification of existance of the new data in the database
    if (
      this.data.username.length > 2 &&
      this.data.username.length < 31 &&
      validator.isAlphanumeric
    ) {
      let usernameExists = await usersCollection.findOne({
        username: this.data.username,
      });
      if (usernameExists) {
        this.errors.push("That username is already exist.");
      }
    }

    //Verification of existance of the new email in the database
    if (validator.isEmail(this.data.email)) {
      let emailExists = await usersCollection.findOne({
        email: this.data.email,
      });
      if (emailExists) {
        this.errors.push("That username is already exist.");
      }
    }
    resolve();
  });
};
//Traditional model
//User.prototype.login = function(callback){
//this.cleanUp();
// usersCollection.findOne({username: this.data.username}, (err, attemptedUser) => {
// if(attemptedUser && attemptedUser.password == this.data.password){
//     callback("Congrats!")
//}else{
//    callback("Invalid user / passwod")
// }
//})
//}
User.prototype.login = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    usersCollection
      .findOne({ username: this.data.username })
      .then((attemptedUser) => {
        if (
          attemptedUser &&
          bcrypt.compareSync(this.data.password, attemptedUser.password)
        ) {
          this.data = attemptedUser;
          this.getAvatar();
          resolve("Congrats!");
        } else {
          reject("Invalid user / passwod");
        }
      })
      .catch(function () {
        reject("Please try again later.");
      });
  });
};

User.prototype.register = function () {
  return new Promise(async (resolve, reject) => {
    // Step #1: Validate user data
    this.cleanUp();
    await this.validate();

    //Step #2: Only if there are no validation errors
    if (!this.errors.length) {
      let salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(this.data.password, salt);
      await usersCollection.insertOne(this.data);
      this.getAvatar();
      resolve();
    } else {
      reject(this.errors);
    }
    //Step #3: Tsave the user data into database
  });
};

User.prototype.getAvatar = function () {
  this.avatar = `https://gravatar.com/avatar/${katbinMd5(
    this.data.email
  )}?s=128`;
};

User.findByUsername = function (username) {
  return new Promise(function (resolve, reject) {
    if (typeof username != "string") {
      reject();
      return;
    }
    usersCollection
      .findOne({ username: username })
      .then(function (userDoc) {
        if (userDoc) {
          userDoc = new User(userDoc, true);
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar,
          };
          resolve(userDoc);
        } else {
          reject();
        }
      })
      .catch(function () {
        reject();
      });
  });
};

User.doesEmailExist = function(email){
  return new Promise(async function(resolve, reject){
    if(typeof(email) != "string"){
      resolve(false)
      return
    }

    let user = await usersCollection.findOne({email: email})
    if(user){
      resolve(true);
    }else{
      resolve(false);
    }
  })
}

module.exports = User;
