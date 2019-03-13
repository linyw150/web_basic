$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var type = getParams.type;
    var typeId = getParams.typeId;
    var num = getParams.num;
    var goodsSkuId = getParams.goodsSkuId;
    var goodsSkuidarr = getParams.goodsSkuidarr;
    var order = getParams.order;
    var orderid = getParams.id;
    var price = getParams.price;
    var storage = window.localStorage;
    var cookieId = storage.id_shopCookie;
    var cookieToken = storage.token_shopCookie;
    var originalHref = $('#noLogining a').attr('href');
    $('#noLogining a').attr('href', originalHref + '?shop=' + shop);
    var originalHref = $('#doc-header a').attr('href');
    toastr.options = {
        "newestOnTop": false,
        "timeOut": 1500,
        "extendedTimeOut": 0,
        "escapeHtml": true,
        "positionClass": "toast-bottom-center"
    };
    if(isWechat()){

    }else{
        $('.aliPayButton').removeClass('hidden');
    }
    $('#doc-body').find('.total').text(price);
    $('.pay-styles').on('click','.pay',function(e){
        e.stopPropagation();
        var btn = $(this);
        var payIcon = btn.find('.pay-icon');
        payIcon.addClass('isChecked');
        btn.siblings('.pay').find('.pay-icon').removeClass('isChecked');
    });
    $("#paybtn").on('click',function(e){
        e.stopPropagation();
        if(cookieId){
            var params = {};
            if($('.wechatPayButton .pay-icon').hasClass('isChecked')){//勾选微信支付

            }else{//不勾选微信支付
                if(isWechat()){
                    toastr.error('请用其它浏览器支付');
                    return false;
                }else{
                    params.id = cookieId;
                    params.token = cookieToken;
                    params.shop = shop;
                    if(order){
                        params.tradeNo = order;
                        ajaxRequest('/api/order/alipayTradeNo', params, 'post', function(data) {
                            window.location.href = data.data;
                        }, function(error) {
                            toggleLoading(false);
                            toastr.error(typeof error.message === 'undefined' ? lang('serverbusy') : error.message);
                        });
                    }else{
                        params.orderId = orderid;
                        ajaxRequest('/api/order/alipayOrderId', params, 'post', function(data) {
                            window.location.href = data.data;
                        }, function(error) {
                            toggleLoading(false);
                            toastr.error(typeof error.message === 'undefined' ? lang('serverbusy') : error.message);
                        });
                    }
                }

            }
        }else{
            toastr.error('尚未登录')
        }
    })

})