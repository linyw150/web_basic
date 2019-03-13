$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var orderId = getParams.orderId;
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
    toastr.options = {
        "newestOnTop": false,
        "timeOut": 1500,
        "extendedTimeOut": 0,
        "escapeHtml": true,
        "positionClass": "toast-bottom-center"
    };
    var shopStatus = {
        '0':'待支付',
        '1': '待发货',
        '2': '待收货',
        '3': '已完成',
        '4': '已过期',
        '11': '买家关闭',
        '12': '卖家关闭'
    };
  var showGoodsOrder = function(){
//        请求后台，填充数据
        if(cookieId){
            var docBody = $('#doc-body');
            $("#doc-body").removeClass("hidden");
            params = {};
            params.id = cookieId;
            params.token = cookieToken;
            params.orderId = orderId;
            var domain = 'http://localhost:1300';
            toggleLoading(true);
            ajaxRequest(domain+'/api/order/detail', params, 'post', function(data) {
                toggleLoading(false);
                var orderDetail = data.data;
                docBody.find(".order-status").text(shopStatus[orderDetail.status]);
                docBody.find(".name").text(orderDetail.receivername);
                docBody.find(".number").text(orderDetail.managermobile);
                docBody.find(".personage-address").text(orderDetail.receiveraddress);

                docBody.find(".store-name").text(orderDetail.shopname);
                docBody.find(".store-status").text(shopStatus[orderDetail.status]);

                docBody.find(".store-serial").text(orderDetail.tradeno)
                docBody.find(".store-place-time").text(orderDetail.createtime)
                docBody.find(".store-pay-time").text(orderDetail.paytime)
                docBody.find(".expressfee").text(orderDetail.expressfee)

                docBody.find(".payment-status").text(shopStatus[orderDetail.status]!=0?'实付款':'需付款')
                docBody.find(".payment").text(orderDetail.payment);
                templateAllGoodsHtml = '';
                var goodsList = orderDetail.goods;
                $.each(goodsList,function(goodsKey,goodsValue){
                            var templateSingleGoodsHtml = $($("#templateGoodsList").clone().html());
                            templateSingleGoodsHtml.find(".goods-picture-cover").css("backgroud-image","url("+goodsValue.cover+")")
                                .addClass("background-size","cover");
                            templateSingleGoodsHtml.find(".represent-dec").html(goodsValue.name);
                            templateSingleGoodsHtml.find(" .represent-price").html(goodsValue.price);
                            templateSingleGoodsHtml.find(".model").html(goodsValue.modelnumber);
                            templateSingleGoodsHtml.find(".scalar").html(goodsValue.count);
                            if(orderDetail.status == 1 || orderDetail.status == 2){/*'1': '待发货',   '2': '待收货',*/

                                if(goodsValue.status == 0){
                                    //orderpage14:申请退款
                                    templateSingleGoodsHtml.css('height','2.6rem').find('.operation-refund-content').addClass('operation-refund').removeClass('details-refund hidden').text("申请退款");
                                }else{
                                    //orderpage15:退款详情
                                    templateSingleGoodsHtml.css('height','2.6rem').find('.operation-refund-content').addClass('details-refund').removeClass('operation-refund hidden').text("退款详情");
                                }
                            }else{
                               /* 0: 待支付
                               '4': '已过期',
                               '11': '买家关闭',
                               '12': '卖家关闭'*/
                                templateSingleGoodsHtml.find('.operation-refund-content').addClass('hidden');
                            };
                            if(orderDetail.status == 3){//'3': '已完成',
                                if(data.status == 0){
                                    //orderpage16 申请售后
                                    templateSingleGoodsHtml.css('height','2.6rem').find('.operation-service-content').addClass('operation-service').removeClass('details-service hidden').text('申请售后');
                                }else{
                                    //orderpage17 售后详情
                                    templateSingleGoodsHtml.css('height','2.6rem').find('.operation-service-content').addClass('details-service').removeClass('operation-service hidden').text('售后详情');
                                }
                            }else{
                                templateSingleGoodsHtml.find('.operation-service-content').addClass('hidden');
                            };
                            templateAllGoodsHtml += templateSingleGoodsHtml.prop("outerHTML");
                            var ccc = templateSingleGoodsHtml.html();
                });
                $(".store-container").find(".store-goods").html(templateAllGoodsHtml);
            }, function(error) { //后台请求不是200，就进入该方法
                toastr.error(error.message);
            });
        }else{
            $("#noLogining").removeClass("hidden");
        }
    };
    showGoodsOrder();



});