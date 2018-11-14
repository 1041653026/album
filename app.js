// 引入模块
var express = require("express");
var mongodb = require("mongodb");
var formid = require("formidable");
var path = require("path");
var fs = require("fs");
var socket_io = require("socket.io");
var body_parser = require("body-parser");
var session = require("express-session");
// 搭建应用
var app = express();
var client = mongodb.MongoClient;
// 定义一个字符串，用来连接服务器
var str = "mongodb://localhost:27017";
// 定义数据库的名字
var base1 = "users";
var base2 = "albums";
//设置各种中间件
app.use(express.static("static"));
app.set("view engine","ejs");
app.use(body_parser.urlencoded({extended:false}));
// 应用session
app.use(session({
  secret: 'dhfaodhfoahf',
  resave: false,
  saveUninitialized: true
}));
var http = require("http");
var server = http.Server(app);
var socket_app = socket_io(server);
app.get("/",function(req,res){
	var username = req.session.username;
	var myid = req.session.myid;
	var hasLogin = req.session.hasLogin;
	var qx = req.session.qx;
	if(hasLogin){
		res.render("index",{
			username : username,
			myid : myid,
			hasLogin : hasLogin,
			qx : qx
		});
	}else{
		res.redirect("door.html");
	}
})
// 配置myid查询路由
app.get("/check_myid",function(req,res){
	// 接收数据
	var myid = req.query.myid;
	// 连接数据库
	client.connect(str,function(err,db){
		if(err){
			res.json({
				error:1,
				data:"数据库连接错误"
			});
			db.close();
		}else{
			var dbo = db.db(base1);
			dbo.collection("user_info").findOne({myid:myid},function(err,result){
				if(err){
					res.json({
						error:2,
						data:"查询时出现错误"
					});
					db.close();
				}else{
					if(result){
						res.json({
							error:3,
							data:"抱歉，该账号已被占用"
						});
						db.close();
					}else{
						res.json({
							error:0,
							data:"恭喜，可以进行注册"
						});
					}
					db.close();
				}
			});
		}
	});
});
// 设置登陆路由
app.post("/login",function(req,res){
	// 获取传送过来的数据，处理post请求用body-parser模块
	var myid = req.body.myid;
	var password = req.body.password;
	//连接数据库
	client.connect(str,function(err,db){
		if(err){
			res.render("error.ejs",{
				error:"连接数据库时出错了"
			});
			db.close();
			return;
		}
		var dbo = db.db(base1);
		// 查询
		dbo.collection("user_info").findOne({myid:myid,password:password},function(err,result){
			if(err){
				db.close();
				res.render("error.ejs",{
					error:"查询时出现错误"
				});
				return;
			}
			db.close();
			// console.log(result)
			if(result){
				// 设置session
				// console.log(result)
				req.session.username = result.username;
				req.session.myid = result.myid;
				req.session.qx = result.qx;
				req.session.hasLogin = true;
			}else{
				req.session.hasLogin = false;
			}
			res.redirect("/");
		});
	});
});
// 设置注册路由
app.post("/regist",function(req,res){
	var username = req.body.username;
	var myid = req.body.myid;
	var password = req.body.password;
	// 链接数据库
	client.connect(str,function(err,db){
		if(err){
			res.render("error",{
				error : "连接数据库失败"
			});
			return;
		}
		var dbo = db.db(base1);
		var obj = {
			username : username,
			myid : myid,
			password : password
		}
		dbo.collection("user_info").insertOne(obj,function(err,result){
			if(err){
				res.render("error",{
					error : "数据插入错误"
				});
				db.close();
				return;
			}
			// 这时认为插入数据成功
			req.session.username = username;
			req.session.myid = myid;
			req.session.hasLogin = true;
			res.redirect("/");
		});
	});
});
var users = [];
var speak = true;
socket_app.on("connection",function(socket){
	// 此处应用闭包
	var obj = null;
	socket.on("come",function(data){
		for(var i = 0;i < users.length;i ++){
			if(users[i] === data.username){
				users.splice(i,1);
				i --;
			}
		}
		obj = data;
		users.push(data.username);
		socket_app.sockets.emit("welcome",users);
	});
	socket.on("message",function(data){
		obj.data = data;
		socket_app.sockets.emit("sendMessage",obj);
	});
	// 监听禁言
	socket.on("jy",function(){
		speak = !speak;
		socket_app.sockets.emit("checkjy",speak);
	});
	socket_app.sockets.emit("checkjy",speak);
	// 监听替人功能
	socket.on("zouni",function(data){
		console.log(data)
		socket_app.sockets.emit("zou",data);
	});
	socket.on("disconnect",function(e){
		// 欢送功能，将其从数组中摘除，然后告诉所有人
		for(var i = 0;i < users.length;i ++){
			if(users[i] === obj.username){
				users.splice(i,1);
				i --;
			}
		}
		socket_app.sockets.emit("bye",obj);
	});
});
server.listen(3000);