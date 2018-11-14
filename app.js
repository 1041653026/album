// 引入模块
var express = require("express");
var mongodb = require("mongodb");
var formid = require("formidable");
var gm = require("gm");
var path = require("path");
var deal = require("deal").deal;
var fs = require("fs");
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
app.use(express.static("albums")); 
app.set("view engine","ejs");
// 应用session
app.use(session({
  secret: 'dhfaodhfoahf',
  resave: false,
  saveUninitialized: true
}))
// 使用user-parser
app.use(body_parser.urlencoded({extended:false}));
//搭建路由
app.get("/",function(req,res){
	// console.log(req.session.touxiang)
	if(req.session.hasLogin){
		res.render("index",{
			username:req.session.username,
			myid:req.session.myid,
			touxiang:req.session.touxiang
		});
	}else{
		res.redirect("/door.html");
	}
}); 
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
				req.session.touxiang = result.touxiang;
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
	// 首先得到注册信息
	// 由于body-parser不能得到enctype="multipart/form-data"的表单信息，所以这里要用formidable模块
	var form = new formid.IncomingForm();
	form.uploadDir = "uploads";
	form.parse(req,function(err,fields,files){
		if(err){
			res.render("error",{
				error:"req解析时出现错误"
			});
			return;
		}
		var username = fields.username;
		var myid = fields.myid;
		var password = fields.password;
		var user_albums = "./albums/" + myid;
		fs.mkdir(user_albums,function(err){
			if(err){
				res.render("error",{
					error:"创建用户相册时失败"
				});
				return;
			}
			// 然后将头像存入到该文件夹下，继续创建文件，存入头像图片
			fs.mkdir(user_albums + "/touxiang",function(err){
				if(err){
					res,render("error",{
						error:"创建用户头像文件夹失败"
					});
					return;
				}
				// 这里分为两种情况，一是传入头就像的情况，另一种是没有传入头像的，用系统随机的头像存入此相册下
				var size = files.touxiang.size;
				if(size){
					// 这是用户上传了头像的情况
					var oldPath = files.touxiang.path;
					var ext = path.parse(files.touxiang.name).ext;
					var touxiang = myid +"/touxiang/touxiang" + ext;
					var newPath = user_albums + "/touxiang/touxiang" + ext;
					fs.rename(oldPath,newPath,function(err){
						if(err){
							res.render("error",{
								error:"头像文件改名时失败"
							});
							return;
						}
						// 这时将用户信息存入数据库中
						// 连接数据库
						client.connect(str,function(err,db){
							if(err){
								res.render("error",{
									error:"连接数据库失败"
								});
								return;
							}
							var dbo = db.db(base1);
							var obj = {
								username : username,
								myid : myid,
								password : password,
								touxiang : touxiang
							}
							dbo.collection("user_info").insertOne(obj,function(err,result){
								if(err){
									res.render("error",{
										error : "数据存入失败"
									});
									db.close();
									return;
								}
								db.close();
								// 这是说明数据存入成功
								req.session.username = username;
								req.session.myid = myid;
								req.session.touxiang = touxiang;
								req.session.hasLogin = true;
								// 跳转到指定页面
								res.redirect("/");
							});
						});
					});
				}else{
					// 这是没有上传头像的情况
					// 这种情况就需要系统给分配一个默认的头像
					fs.readFile("default/default.jpg",function(err,data){
						if(err){
							res.render("error",{
								error:"头像读取时失败"
							});
							return;
						}
						// console.log(data);
						// 定义头像路径
						var touxiang = myid + "/touxiang/touxiang.jpg";
						fs.appendFile("./albums/" + touxiang,data,function(err){
							if(err){
								res.render("error",{
									error : "添加头像文件夹失败"
								});
								return;
							}
							// 将用户信息插入数据库
							// 连接数据库
							client.connect(str,function(err,db){
								if(err){
									res.render("error",{
										error:"连接数据库失败"
									});
									return;
								}
								var dbo = db.db(base1);
								var obj = {
									username : username,
									myid : myid,
									password : password,
									touxiang : touxiang
								}
								dbo.collection("user_info").insertOne(obj,function(err,result){
									if(err){
										res.render("error",{
											error : "数据存入失败"
										});
										db.close();
										return;
									}
									db.close();
									// 这是说明数据存入成功
									req.session.username = username;
									req.session.myid = myid;
									req.session.touxiang = touxiang;
									req.session.hasLogin = true;
									// 跳转到指定页面
									res.redirect("/");
								});
							});
						});
					});
				}
			});
		});
	});
});
// 管理相册路由
app.get("/manage_albums",function(req,res){
	if(!req.session.hasLogin){
		res.redirect("/");
		return;
	}
	var username = req.session.username;
	var touxiang = req.session.touxiang;
	var myid = req.session.myid;
	// 查询有多少相册
	fs.readdir("./albums/" + myid,function(err,arr){
		if(err){
			res.render("error",{
				error : "查询相册失败"
			});
			return;
		}
		// 过滤掉头像将arr传回
		for(var i = 0 ;i < arr.length ; i ++){
			if(arr[i] === "touxiang"){
				arr.splice(i,1);
				break;
			}
		}
		res.render("manage_albums",{
			username : username,
			myid : myid,
			touxiang : touxiang,
			albums : arr
		});
	});
});
// 添加相册路由
app.get("/add_albums",function(req,res){
	// 得到数据
	var album_name = req.query.album_name;
	var myid = req.session.myid;
	// 判断相册是否重名
	fs.readdir("./albums/" + myid,function(err,arr){
		if(err){
			res.json({
				error : 1,
				data : "读取相册失败"
			});
			return;
		}
		for(var i = 0;i < arr.length; i++){
			if(album_name === arr[i]){
				res.json({
					error : 2,
					data : "已存在该相册"
				});
				return;
			}
		}
		// 添加相册
		fs.mkdir("./albums/" + myid + "/" + album_name,function(err){
			if(err){
				res.json({
					error : 3,
					data : "创建相册失败"
				});
			}else{
				res.json({
					error : 0,
					data : "创建成功"
				});
			}
		});
	});
});
// 删除相册路由
app.get("/del_album",function(req,res){
	// 得到相册信息
	var myid = req.session.myid;
	var album_name = req.query.album_name;
	// 删除相册
	try{
		deal("./albums/" + myid + "/" + album_name);
	}catch(e){
		res.json({
			error : 1,
			data : "删除相册时出错"
		});
		return;
	}
	// 这时要将数据库信息删除
	client.connect(str,function(err,db){
		if(err){
			res.json({
				error : 2,
				data : "连接数据库失败"
			});
			return;
		}
		var dbo = db.db(base2);
		var obj = {
			myid : myid,
			album_name : album_name
		}
		dbo.collection("albums_info").remove(obj,function(err,result){
			if(err){
				res.json({
					error : 3,
					data : "删除数据失败"
				});
				db.close();
				return;
			}
			db.close();
			res.json({
				error : 0,
				data : "删除成功"
			});
		});
	});
});
// 显示图片路由
app.get("/show_pic",function(req,res){
	// 获取信息
	var myid = req.session.myid;
	var album_name = req.query.album_name;
	/*// 查询图片
	fs.readdir("./albums/" + myid + "/" + name,function(err,arr){
		if(err){
			res.json({
				error : 1,
				data : "请求图片失败"
			});
			return;
		}
		for(var i = 0;i < arr.length; i ++){
			arr[i] = myid + "/" + name + "/" + arr[i];
		}
		res.json({
			error : 0,
			data : {
				arr : arr
			}
		});
	});*/

	// 直接去数据库请求信息
	client.connect(str,function(err,db){
		if(err){
			res.json({
				error : 1,
				data  : "连接数据库失败"
			});
			return;
		}
		var dbo = db.db(base2);
		var obj = {
			myid : myid,
			album_name : album_name
		}
		dbo.collection("albums_info").find(obj).toArray(function(err,arr){
			if(err){
				res.json({
					error : 2,
					data : "查询数据失败"
				});
				db.close();
				return;
			}
			db.close();
			res.json({
				error : 0,
				data : {
					arr : arr
				}
			});
		});
	});
});
// 删除图片路由
app.get("/del_pic",function(req,res){
	// 获取信息
	var pic_path = req.query.pic_path;
	var myid = req.session.myid;
	var album_name = req.query.album_name;
	var pic_name = path.parse(pic_path).base;
	// 删除图片
	fs.unlink("./albums/" + pic_path,function(err,result){
		if(err){
			res.json({
				error : 1,
				data : "访问图片出错"
			});
			return;
		}
		// 这时要删除数据库信息
		client.connect(str,function(err,db){
			if(err){
				res.json({
					error : 2,
					data : "连接数据库失败"
				});
				return;
			}
			var dbo = db.db(base2);
			var obj = {
				myid : myid,
				album_name : album_name,
				pic_name : pic_name
			}
			dbo.collection("albums_info").remove(obj,function(err,result){
				if(err){
					res.json({
						error : 3,
						data : "删除数据失败"
					});
					db.close();
					return;
				}
				db.close();
				res.json({
					error : 0,
					data : "删除成功"
				});
			});
		});
	});
});
// 上传图片路由
app.post("/upload_pic",function(req,res){
	// 使用formid模块接收文件
	var form = new formid.IncomingForm();
	form.uploadDir = "uploads";
	form.parse(req,function(err,fields,files){
		// 获取信息
		var myid = req.session.myid;
		var album_name = fields.select_album;
		// 文件上传时图片权限默认设置为分享
		var share = "true";
		var oldPath = files.new_pic.path;
		var pic_name = files.new_pic.name;
		var newPath = "./albums/" + myid + "/" + album_name + "/" + pic_name;
		/*
		***************
		这里先判断一下数据库是否存在该图片数据，如果存在就提示该图片已经存在，不将其存入
		*/
		client.connect(str,function(err,db){
			if(err){
				res.render("error",{
					error : "连接数据库失败"
				});
				return;
			}
			var dbo = db.db(base2);
			var obj = {
				myid : myid,
				album_name : album_name,
				pic_name : pic_name
			}
			// 查询
			dbo.collection("albums_info").findOne(obj,function(err,result){
				if(err){
					res.render("error",{
						error : "数据查询失败"
					});
					db.close();
					return;
				}
				db.close();
				if(!result){
					// 说明数据库中没有该图片，可以上传
					fs.rename(oldPath,newPath,function(err){
						if(err){
							res.render("error",{
								error : "图片改名失败"
							});
							return;
						}
						// 此时说明一切正常，将图片信息存入数据库
						// 连接数据库
						client.connect(str,function(err,db){
							if(err){
								res.render("error",{
									error : "连接数据库失败"
								});
								return;
							}
							// 存入数据
							var dbo = db.db(base2);
							var obj = {
								myid : myid,
								album_name : album_name,
								pic_name : pic_name,
								share : share
							}
							dbo.collection("albums_info").insertOne(obj,function(err,result){
								if(err){
									res,render("error",{
										error : "存入数据失败"
									});
									db.close();
									return;
								}
								db.close();
								// 存入数据成功
								res.redirect("/manage_albums");
							});	
						});
					});
				}else{
					// 此时说明数据库中已经存在改图片了，不能继续上传
					res.render("error",{
						error : "该图片已经在相册中"
					});
				}
			});
		});
	});
});
// 修改图片权限信息路由
app.get("/pic_share",function(req,res){
	// 得到信息
	var pic_path = req.query.pic_path;
	var myid = req.session.myid;
	var album_name = req.query.album_name;
	var pic_name = path.parse(pic_path).base;
	var share = req.query.share;
	// 连接数据库修改信息
	client.connect(str,function(err,db){
		if(err){
			res.json({
				error : 1,
				data : "连接数据库失败"
			});
			return;
		}
		var dbo = db.db(base2);
		var obj = {
			myid : myid,
			album_name : album_name,
			pic_name : pic_name,
		}
		var newobj = {
			$set : {
				share : share
			}
		}
		dbo.collection("albums_info").updateOne(obj,newobj,function(err,result){
			if(err){
				res.json({
					error : 2,
					data : "修改权限信息失败"
				});
				db.close();
				return;
			}
			db.close();
			res.json({
				error : 0,
				data : "修改图片权限成功！"
			});
		});
	});
});
// 全部相册路由
app.get("/all_albums",function(req,res){
	if(!req.session.hasLogin){
		res.redirect("/");
		return;
	}
	// 获取信息
	var myid = req.session.myid;
	var username = req.session.username;
	var touxiang = req.session.touxiang;
	// 去数据库查询用户然后渲染页面
	client.connect(str,function(err,db){
		if(err){
			res.render("error",{
				error : "连接数据库失败"
			});
			return;
		}
		var dbo = db.db(base1)
		dbo.collection("user_info").find({}).toArray(function(err,arr){
			if(err){
				res.render("error",{
					error : "查询失败"
				});
				db.close();
				return;
			}
			db.close();
			res.render("all_albums",{
				username : username,
				myid : myid,
				touxiang : touxiang,
				arr : arr
			});
		});
	});
});
// 用户相册路由
app.get("/user_albums",function(req,res){
	if(!req.session.hasLogin){
		res.redirect("/");
		return;
	}
	var touxiang = req.session.touxiang;
	var myid = req.session.myid;
	var username = req.session.username;
	var hisid = req.query.hisid;
	fs.readdir("./albums/" + hisid,function(err,arr){
		if(err){
			res.render("error",{
				error : "查询失败"
			});
			return;
		}
		// 过滤头像相册
		for(var i = 0 ;i < arr.length;i ++){
			if(arr[i] === "touxiang"){
				arr.splice(i,1);
				break;
			}
		}
		res.render("user_albums",{
			touxiang : touxiang,
			username : username,
			myid : myid,
			hisid : hisid,
			arr : arr
		});
	});
});
// 查看用户图片路由
app.get("/user_album",function(req,res){
	var myid = req.session.myid;
	var username = req.session.usernaem;
	var touxiang = req.session.touxiang;
	var hisid = req.query.hisid;
	var showalbum = req.query.showalbum;
	client.connect(str,function(err,db){
		if(err){
			res.render("error",{
				error : "连接数据库失败"
			});
			return;
		}
		var dbo = db.db(base2);
		var obj = {
			myid : hisid,
			album_name : showalbum
		}
		dbo.collection("albums_info").find(obj).toArray(function(err,arr){
			if(err){
				res.render("error",{
					error : "查询失败"
				});
				db.close();
				return;
			}
			db.close();
			res.render("user_album",{
				myid : myid,
				username : username,
				touxiang : touxiang,
				arr : arr
			});
		});
	});
});
// 头像剪切路由
app.get("/caijian",function(req,res){
	var username = req.session.username;
	var myid = req.session.myid;
	var touxiang = req.session.touxiang;
	res.render("caijian",{
		username : username,
		touxiang : touxiang,
		myid : myid
	});
});
// 裁剪头像
app.get("/caijianT",function(req,res){
	var touxiang = req.session.touxiang;
	var x = req.query.x;
	var y = req.query.y;
	var w = req.query.w;
	var h = req.query.h;
	console.log(touxiang,x,y,w,h)
	// 用gm模块对头像进行裁剪
	gm("albums/" + touxiang).crop(w,h,x,y).write("albums/" + touxiang,function(err){
		if(err){
			res.json({
				error : 1,
				data : "头像裁剪失败"
			});
			console.log(err)
			return;
		}
		res.json({
			error : 0,
			data : "头像裁剪成功"
		});
	})
});
// 更改头像路由
app.post("/up_head_pic",function(req,res){
	var touxiang = req.session.touxiang;
	console.log(touxiang)
	var myid = req.session.myid;
	var form = new formid.IncomingForm;
	form.parse(req,function(err,fields,files){
		if(err){
			res.render({
				error : "修改头像失败"
			});
			return;
		}
		// 先删除以前的头像
		fs.unlink("./albums/" + touxiang,function(err,result){
			if(err){
				res.render("error",{
					error : "删除原头像失败"
				});
				return;
			}
			// 加入新头像
			var oldPath = files.new_head.path;
			var ext = path.parse(files.new_head.name).ext;
			var new_touxiang = myid + "/touxiang/touxiang" + ext;
			fs.rename(oldPath,"./albums/" + new_touxiang ,function(err){
				if(err){
					res.render({
						error : "头像改名失败"
					});
					return;
				}
				req.session.touxiang = new_touxiang;
				console.log(new_touxiang)
				res.redirect("/caijian");
			});
		});
	});
});
// 配置退出路由
app.get("/exit",function(req,res){
	req.session.username = "";
	req.session.myid = "";
	req.session.touxiang = "";
	req.session.hasLogin = false;
	res.redirect("/");
});
// 监听端口
app.listen(3000);