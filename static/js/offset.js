function offset(dom){
	// 判定是否是ie8 
	if(window.navigator.userAgent.indexOf("MSIE 8.0")!= -1){
		console.log("当前的浏览器是IE8")
		var IE8 = true;
	}
	// 将dom传递进来然后通过计算得到距离body的对象
	var obj ={
		left:0,
		top:0
	};
	// 开始计算
	var top = dom.offsetTop;
	var left = dom.offsetLeft;
	// 如果定义变量的话，这个函数就写死了，只能是适用于固定层数的元素 
	// 循环查找每一层的offsetLeft和offsetTop以及clientLeft  clientTop;

	while(dom=dom.offsetParent){
		if(IE8){
			// 如果是IE8  就不用加边框了 
			top += dom.offsetTop;
			left += dom.offsetLeft;
		}else{
			top += dom.offsetTop + dom.clientTop;
			left += dom.offsetLeft + dom.clientLeft;
		}
		// dom = dom.offsetParent;
	}
	obj.left = left;
	obj.top = top;
	return obj;
	// var parent = dom.offsetParent;

}