<?php
	// 用于处理客户端的Ajax异步请求
	// 1. 接收客户端发送的请求数据
	$user = $_GET['user'];
	// 2. 向客户端进行响应
	echo $user.' get request succesful.';
?>