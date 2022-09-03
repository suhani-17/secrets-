//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//authentication using md5
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");

//authentication using bycrypt
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

//authentication using passport 
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();



app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));


app.use(session({
    secret: "my name is suhani jain.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
res.render("home"); 
});

app.route("/auth/google")
.get(passport.authenticate("google", {scope: ["profile"]}));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
res.render("login");
});

app.get("/register",function(req,res){
res.render("register");
});

app.get("/secrets",function(req,res){
User.find({"secret": {$ne:null}},function(err,foundUsers){
  if(err){
    console.log(err);
  }else{
    res.render("secrets",{userWithSecrets:foundUsers});
    
  }
})
});

app.get("/logout",function(req,res){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
}else{
    res.redirect("/login");
}
});

app.post("/submit",function(req,res){
const submittedSecret = req.body.secret;

User.findOne({_id:req.user.id},function(err,foundUser){
  if(err){
    console.log(err);
  }else{
    if(foundUser){
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  }
});


});

app.post("/register",function(req,res){

    //authentication using bycrypt 

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //         });
    //         newUser.save(function(err){
    //             if(err){
    //                 console.log(err);
    //             }else{
    //                 res.render("secrets");
    //             }
    //         });
    // });


    //authentication using passport 

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
             res.redirect("/secrets");
            }) ;
        }
    });

   

});

app.post("/login",function(req,res){
//using bycrypt 
     //     username = req.body.username;
    //     password = req.body.password;
    // User.findOne({email:username},function(err,foundUser){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         if(foundUser){
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                 if(result===true){
    //                 res.render("secrets")
    //                 }else{
    //                     res.send("enter correct username or password!");
                    
    //                 }
              
    //             });
               
            
    //         }
    //     }
    // })


     //using passport 

     const user = new User({
        username: req.body.username,
        password: req.body.password

});

req.login(user,function(err){

    if(err){
        console.log(err);
    }else{
        passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
        });
    }
});



});











app.listen("3000",function(){
console.log("server is up and running on port 3000");
});