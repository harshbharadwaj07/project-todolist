//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const date = require(__dirname + "/date.js");
const mongoose=require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const _=require("lodash");
const req = require('express/lib/request');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-harsh:"+process.env.MONGO_KEY+"@cluster0.pqd8uax.mongodb.net/todolistDB");


const ItemSchema=new mongoose.Schema({
  name:String,
  userno:String,
  username:String
});
const Item=mongoose.model("Item",ItemSchema);
const completeSchema=new mongoose.Schema({
  name:String,
  userno:String,
  username:String,
  listtype:String
});
const Complete=mongoose.model("Complete",completeSchema)

const listSchema=new mongoose.Schema({
  listname:String,
  items:[ItemSchema]
});
const List=mongoose.model("List",listSchema);

const userSchema = new mongoose.Schema ({
  name:String,
  email: String,
  password: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


app.get("/", function(req, res){
  res.render("start");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/user",function(req,res){
  res.render("user");
});

app.get("/pass",function(req,res){
  res.render("pass");
});

app.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/user");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/login");
      });
    }
  });

});

app.post('/login', passport.authenticate('local', { failureRedirect: '/pass' }),
  function(req, res) {
    res.redirect('/list');
  });

app.get("/list", function(req, res) {
const day = date.getDate();

  Item.find({userno:req.user._id},function(err,foundItems){
    
    Complete.find({userno:req.user._id,listtype:day},function(err,items){
      res.render("list", {user:req.user.username,listTitle: day, newListItems: foundItems,completeItems: items});
      });
  });
});

app.post("/user",function(req,res){
  res.redirect("/register");
});
app.post("/pass",function(req,res){
  res.redirect("/login");
});


// main app

app.get("/gstart",function(req,res){
  res.render("gstart");
});
app.get("/mylist",function(req,res){
  List.find({"items.userno":req.user._id}, function(err, list){
    if(!err){
      res.render("mylist",{array:list});
    }
  });
});

app.post("/list", function(req, res){

  const itemName=req.body.newItem;
  const listName=req.body.list;

  const item=new Item({
    name:itemName,
    userno:req.user._id,
    username:req.user.username
  });
  if(listName===date.getDate()){
    item.save();
    res.redirect("/list");
  }else{
    List.findOne({"items.userno":req.user._id,listname:listName},function(err,foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/list/"+listName);
    })
  }
});

app.post("/complete",function(req,res){
  let checkedItemId=req.body.checkbox;
  let listType=req.body.listName;
  if(listType===date.getDate()){
    Item.findById(checkedItemId,function(err,item){
      if(err){
        console.log(err);
      }else{
        const complete=new Complete({
          name:item.name,
          userno:item.userno,
          username:item.username,
          listtype:listType
        });
        complete.save();
        Item.findByIdAndRemove(checkedItemId,function(err){
          if(err){
            console.log(err);
          }else{
            console.log("Deleted successfully");
            res.redirect("/list");
          }
        });
      }
    });
  }
});

app.post("/delete",function(req,res){
  let checkedItemId=req.body.checkbox;
  let listType=req.body.listName;
  
  if(listType===date.getDate()){
    Complete.findByIdAndRemove(checkedItemId,function(err){
      if(err){
        console.log(err);
      }else{
        console.log("Deleted successfully");
        res.redirect("/list");
      }
    });
  }else{
    List.findOneAndUpdate({"items.userno":req.user._id,listname:listType},{$pull:{items:{_id:checkedItemId}}},function(err,foundList){
      if(!err){
        res.redirect("/list/"+listType);
      }
    });
  }
});


app.get("/list/:new",function(req,res){

    const item1=new Item({
        name:"Welcome to your custom todolist!",
        userno:req.user._id,
        username:req.user.username
      });
      const item2=new Item({
        name:"hit the + button to add a new item.",
        userno:req.user._id,
        username:req.user.username
      });
      const item3=new Item({
        name:"Press checkbox to delete an item",
        userno:req.user._id,
        username:req.user.username
      });
      const defaultItems=[item1,item2,item3];

  const customList=_.capitalize(req.params.new);
  List.findOne({"items.userno":req.user._id,listname:customList},function(err,result){
    if(err){
      console.log(err);
    }else{
      // console.log(result);
      if(!result){
        //Creates a new list
        const list=new List({
          listname:customList,
          items:defaultItems
        });
        list.save();
        res.redirect("/list/"+customList);
      }else{
        
        // Show existing list
        res.render("custom",{user:req.user.username,listTitle: result.listname, newListItems: result.items});
      }
    }
  });
  
});

app.post("/mylist",function(req,res){
  
    const listname = req.body.listname;
    res.redirect("/list/"+listname);
  });

app.post("/del",function(req,res){
    const dellist=req.body.perm;
    console.log(dellist);
    List.findOneAndDelete({"items.userno":req.user._id,listname:dellist},function(err,delist){
      if(!err){
        console.log("List Deleted");
        res.redirect("/mylist");
      }
    });
});

app.post("/user",function(req,res){
    res.redirect("/register");
});
app.post("/pass",function(req,res){
    res.redirect("/login");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});