$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var originalHref = $('.back-home').attr('href');
    console.log(shop);
    if(shop){
        $('.back-home').attr('href', originalHref + '?shop=' + shop);
    }else{
        $('.back-home').attr('href', 'javascript:history.back();');
    }
    var storage = window.localStorage;
    var cookieId = storage.id_shopCookie;
    var cookieToken = storage.token_shopCookie;
    var centerLogin = $('.center-login-content');
    var statusContent = $('.status-content');
    var orderContent = $('.order-content');
    if(cookieId){
        var params = {};
        params.id = cookieId;
        params.token = cookieToken;
        centerLogin.find('.already-logged').removeClass('hidden');
        var domain = 'http://localhost:1300';
        ajaxRequest(domain+'/api/account/show', params, 'post', function(data) {
            console.log(data);
            var info = data.data;
            toggleLoading(false);
            centerLogin.find('.mobile').text(info.mobile);
            centerLogin.find('.head-portrait').css("background-image","url("+info.imgurl+")").css("background-size","100% 100%");
            if(parseInt(info.waitToPay)>0){
                statusContent.find('.payment-icon .num').text(parseInt(info.waitToPay));
            };
            if(parseInt(info.waitToPay)>0){
                statusContent.find('.shipments-icon .num').text(parseInt(info.waitToSend));
            };
            if(parseInt(info.waitToPay)>0){
                statusContent.find('.gathering-icon .num').text(parseInt(info.send));
            };
            if(parseInt(info.waitToPay)>0){
                statusContent.find('.aftersale-icon .num').text(parseInt(info.refund));
            };

        }, function(error) {
            toggleLoading(false);
            toastr.error(typeof error.message === 'undefined' ? lang('serverbusy') : error.message);
        });
    }else{
        centerLogin.find('.unlisted').removeClass('hidden');
    }
    centerLogin.on('click','.btn-login',function(e){
        e.stopPropagation();
        window.location.href = '/view/PublicPage/login.html?shop='+shop;
    }).on('click','.head-portrait',function(e){
        e.stopPropagation();
        window.location.href = '/view/PublicPage/information.html?shop='+shop;
    })
    orderContent.on('click','.mine-order',function(e){
        e.stopPropagation();
        window.location.href = '/view/OrderPage/order.html?shop='+shop;
    })
    orderContent.on('click','.status-list',function(e){
        e.stopPropagation();
        var value = $(this).data('status');//获取自定义的属性
        console.log(value);
        if(value == 3){

        }else{
            window.location.href = '/view/OrderPage/order.html?shop='+shop+"&type="+value;
        }
    })

});