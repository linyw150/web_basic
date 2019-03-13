/*
 * 自己模拟jQuery中的html()
 * * 获取 - html()
 * * 设置 - html([html])
 *
 * 分析
 * * 因为html()方法具有设置功能,需要接受参数
 */
function html(html){
	// html参数 - 1)有值-设置;2)没值-获取
	if(html){// 将非布尔值,放置在布尔表达式
		// 设置
		element.innerHTML = html;
	}else{
		// 获取
		return element.innerHTML;
	}
}
function val(value){
	if(value){
		// 设置
		element.value = value;
	}else{
		// 获取
		return element.value;
	}
}
/*
 * 模拟jQuery中的bind(type,fn)
 */
function bind(type,fn){
	element.addEventListener(type,fn);
}