$(function(){
	// 获取元素
	// 对myid,password,re_password进行正则判断
	// 对myid进行数据库查询
	var $username = $("#username");
	var $myid = $("#myid");
	var $password = $("#password");
	var $re_password = $("#re_password");
	var $submit = $("#submit");
	var myid_lock = false;
	var username_lock = false;
	var password_lock = false;
	var re_password_lock = false;
	// 绑定事件
	$username.focus(function(){
		$(this).val("");
	});
	$myid.focus(function(){
		$(this).val("");
	});
	$password.focus(function(){
		$(this).val("");
	});
	$re_password.focus(function(){
		$(this).val("");
	});
	//正则验证
	$myid.blur(function(){
		var val = $(this).val();
		var reg = /^[0-9a-zA-Z]{5,10}$/;
		if(reg.test(val)){
			// 发送ajax查询
			$.ajax({
				url:"/check_myid",
				data:{
					myid:val
				},
				type:"get",
				dataType:"json",
				success:function(data){
					// 判断data
					if(!data.error){
						alert(data.data);
						myid_lock = true;
					}else{
						alert(data.data);
						myid_lock = false;
					}
				}
			});
		}else{
			console.log("请输入5~10位数字或字母")
			myid_lock = false;
		}
	});
	$password.blur(function(){
		var reg = /^\w{6,10}$/;
		if(reg.test(this.value)){
			password_lock = true;
		}else{
			console.log("请输入6~10位密码");
			password_lock = false;
		}
	});
	$re_password.blur(function(){
		if(this.value === $password.val()){
			re_password_lock = true;
		}else{
			console.log("与前一次密码不符，请检查后输入");
			re_password_lock = false;
		}
	});
	$username.blur(function(){
		var reg = /^[0-9a-zA-Z\u4e00-\u9fa5]{1,6}$/;
		if(reg.test(this.value)){
			username_lock = true;
		}else{
			console.log("请输入1~6位用户名");
			username_lock = false;
		}
	});
	$submit.click(function(e){
		if(!(username_lock && password_lock && re_password_lock && myid_lock)){
			e.preventDefault();
		}
	});
});