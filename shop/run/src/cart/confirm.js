$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var typeId = getParams.typeId;
    var num = getParams.num;
    var goodsSkuId = getParams.goodsSkuId;
    var goodsSkuidarr = getParams.goodsSkuidarr;
    var addressId = getParams.addressId;
    var expressfee = 0;
    var originalHref = $('.back-home').attr('href');
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
    var addressContainer = $('.address-container');
    var requestShopOrder = function(){
        if(cookieId){
            $('#doc-body').removeClass('hidden');
            $('#doc-foot').removeClass('hidden');
            var params = {};
            params.id = cookieId;
            params.token = cookieToken;
            params.num = num;
            params.goodsSkuId = goodsSkuId;
            ajaxRequest(domain+"/order/create/"+shop,params,'post',function(data){
                var info = data.data;
                var confirmOrderHTML = '';
                var allTotalNum = 0;//多个订单所包含的商品总数
                var allTotolMoney = 0;//多个订单总额
                if(info.length){
                    $.each(info,function(key,value){
                        var GoodsListHTML = '';
                        var totalNum = 0;//单个订单所包含的商品总数
                        var totolMoney = 0;//单个订单总额
                        var templateOrderHTML = $($('#templateOrder').clone().html());
                        templateOrderHTML.attr('data-id',value.shopId);
                        templateOrderHTML.find('.store-name').text(value.shopName);
                        templateOrderHTML.find('.store-send-pay .pay').text(parseFloat(value.expressfee).toFixed(2));
                        $.each(value.goods, function(index, data) {
                            var templateGoodsListHTML = $($('#templateGoodsList').clone().html());
                            templateGoodsListHTML.attr('data-goodsId',data.goodsId);
                            templateGoodsListHTML.attr('data-goodsSkuId',data.goodsSkuId);
                            templateGoodsListHTML.find('.goods-picture-cover').css({"background-image":"url("+data.cover+")","background-size":"auto 100%","background-position":"center"});
                            templateGoodsListHTML.find('.represent-dec').text(data.goodsName);
                            templateGoodsListHTML.find('.scalar').text(data.num);//商品数量
                            templateGoodsListHTML.find('.represent-price .price').text(parseFloat(data.price).toFixed(2));
                            totolMoney += parseFloat(data.price);
                            totalNum += parseInt(data.num);
                            GoodsListHTML += templateGoodsListHTML.prop('outerHTML');
                        });
                        if(value.address&&value.address.name){
                            addressContainer.find('.alreadly').removeClass('hidden');
                            addressContainer.find('.name').text(value.address.name);
                            addressContainer.find('.number').text(value.address.mobile);
                            addressContainer.find('.address').text(value.address.address);
                            addressContainer.attr('data-addressId',value.address.id);
                            if(value.address.default == 1){
                                addressContainer.find('.tacitly').removeClass('hidden');
                            }else{
                                addressContainer.find('.tacitly').addClass('hidden');
                            }
                        }else{
                            addressContainer.find('.notYet').removeClass('hidden');
                        }
                        allTotolMoney  += totolMoney;
                        allTotalNum += totalNum;
                        templateOrderHTML.find('.store-goods').html(GoodsListHTML);
                        templateOrderHTML.find('.store-foot .pay').text(totolMoney);
                        templateOrderHTML.find('.store-foot .choice').text(totalNum);
                        confirmOrderHTML += templateOrderHTML.prop('outerHTML');
                    })
                    $('#doc-foot').find('.all-price').text('￥'+allTotolMoney.toFixed(2));
                    $('#doc-foot').find('.num').text(allTotalNum);

                }else{
                    confirmOrderHTML  = $('#templateOrderEmpty').clone().html();

                }
                $('#doc-body').find('#shopOrderList').html(confirmOrderHTML);


            },function(error){

            });
        }

    }
    //从购物车进入确认订单页面
    var requestCartShopOrder = function(){
        if(cookieId){
            $('#doc-body').removeClass('hidden');
            $('#doc-foot').removeClass('hidden');
            var params = {};
            params.id = cookieId;
            params.token = cookieToken;
            params.num = num;
            params.goodsSkuId = goodsSkuId;
            ajaxRequest(domain+"/order/show/"+shop,params,'post',function(data){
                var info = data.data;
                var confirmOrderHTML = '';
                var allTotalNum = 0;//多个订单所包含的商品总数
                var allTotolMoney = 0;//多个订单总额
                if(info.length){
                    $.each(info,function(key,value){
                        var GoodsListHTML = '';
                        var totalNum = 0;//单个订单所包含的商品总数
                        var totolMoney = 0;//单个订单总额
                        var templateOrderHTML = $($('#templateOrder').clone().html());
                        templateOrderHTML.attr('data-id',value.shopId);
                        templateOrderHTML.find('.store-name').text(value.shopName);
                        templateOrderHTML.find('.store-send-pay .pay').text(parseFloat(value.expressfee).toFixed(2));
                        $.each(value.goods, function(index, data) {
                            var templateGoodsListHTML = $($('#templateGoodsList').clone().html());
                            templateGoodsListHTML.attr('data-goodsId',data.goodsId);
                            templateGoodsListHTML.attr('data-goodsSkuId',data.goodsSkuId);
                            templateGoodsListHTML.find('.goods-picture-cover').css({"background-image":"url("+data.cover+")","background-size":"auto 100%","background-position":"center"});
                            templateGoodsListHTML.find('.represent-dec').text(data.goodsName);
                            templateGoodsListHTML.find('.scalar').text(data.num);//商品数量
                            templateGoodsListHTML.find('.represent-price .price').text(parseFloat(data.price).toFixed(2));
                            totolMoney += parseFloat(data.price);
                            totalNum += parseInt(data.num);
                            GoodsListHTML += templateGoodsListHTML.prop('outerHTML');
                        });
                        if(value.address&&value.address.name){
                            addressContainer.find('.alreadly').removeClass('hidden');
                            addressContainer.find('.name').text(value.address.name);
                            addressContainer.find('.number').text(value.address.mobile);
                            addressContainer.find('.address').text(value.address.address);
                            addressContainer.attr('data-addressId',value.address.id);
                            if(value.address.default == 1){
                                addressContainer.find('.tacitly').removeClass('hidden');
                            }else{
                                addressContainer.find('.tacitly').addClass('hidden');
                            }
                        }else{
                            addressContainer.find('.notYet').removeClass('hidden');
                        }
                        allTotolMoney  += totolMoney;
                        allTotalNum += totalNum;
                        templateOrderHTML.find('.store-goods').html(GoodsListHTML);
                        templateOrderHTML.find('.store-foot .pay').text(totolMoney);
                        templateOrderHTML.find('.store-foot .choice').text(totalNum);
                        confirmOrderHTML += templateOrderHTML.prop('outerHTML');
                    })
                    $('#doc-foot').find('.all-price').text('￥'+allTotolMoney.toFixed(2));
                    $('#doc-foot').find('.num').text(allTotalNum);

                }else{
                    confirmOrderHTML  = $('#templateOrderEmpty').clone().html();

                }
                $('#doc-body').find('#shopOrderList').html(confirmOrderHTML);


            },function(error){

            });
        }

    }
    requestShopOrder();
    if(typeId){
        $('#doc-header a').attr('href', '/shop/details/details.html?shop='+shop+'&id='+typeId);
        requestShopOrder();
    }else{
        $('#doc-header a').attr('href', '/shop/cart/cart.html?shop='+shop);
        requestCartShopOrder();
    }
    $('#doc-body').on('click','.address-container',function(e){
        e.stopPropagation();
        if(typeId){
            window.location.href = '/view/cart/addresslist.html?shop='+shop+'&num='+num+'&goodsSkuId='+goodsSkuId+'&typeId='+typeId;
        }else{
            window.location.href = '/view/cart/addresslist.html?shop='+shop+'&goodsSkuidarr='+goodsSkuidarr;
        }
    });
    $('#pay').on('click',function(e){
        e.stopPropagation();
//        var addressId = $('#doc-body .address-container').data('addressid');
        var addressId = '13';
        var order = [];//一个父订单的所有店铺的商品数组
        var price = 0;
        $('#doc').find('.store-container').each(function(){//遍历一个父订单的所有子订单（实际是不同的店铺）
            var sonOrder ={};
            var goods = [];
            sonOrder.shopId = $(this).data('id');
            sonOrder.payment = $(this).find('.store-foot .pay').text();
            sonOrder.message = $(this).find('.store-message-content').val();
            sonOrder.addressId = addressId;
            price += parseFloat(sonOrder.payment); // 支付金额
            $(this).find('.store-goods-list').each(function(){
                var singleGoods = {}
                singleGoods.goodsSkuId = $(this).data('goodsskuid');//商品所属id
                singleGoods.num = $(this).find('.scalar').text();//商品的数量
                goods.push(singleGoods);

            })
            sonOrder.goods = goods;
            order.push(sonOrder)
        })
        var params = {};
        params.id = cookieId;
        params.token = cookieToken;
        params.orders = order;
        params.addressId = addressId;
        params.expressfee = expressfee;
        ajaxRequest(domain+'/order/add', params, 'post', function(data) {
            var ordernumber = data.data.orderNumber;
            var info = data.data.info
            if (isWechat()){
                var backHost = 'booking.uclbrt.com';
                if(window.typeParam == 'third'){
                    backHost = 'test.uclbrt.com';
                }
                var backUrl = '';
                if(typeId){
                    backUrl = 'http://' + backHost + domain+'/client/Wechat/getPayPage.html?shop='+shop+':num='+num+':goodsSkuId='+goodsSkuId+':typeId='+typeId+':order='+ordernumber+':price='+price.toFixed(2);
                }else{
                    backUrl = 'http://' + backHost + domain+'/client/Wechat/getPayPage.html?shop='+shop+':order='+ordernumber+':price='+price.toFixed(2);
                }
                window.location.href = 'http://cz.uclbrt.com/Wechat/WechatLoginPage/auth.html?ai='+info.ai+'&asc='+info.asc+'&scope=base&url=' + encodeURIComponent(backUrl);
            } else {
                if(typeId){
                    window.location.href = '/view/pay/pay.html?shop='+shop+'&num='+num+'&goodsSkuId='+goodsSkuId+'&typeId='+typeId+'&order='+ordernumber+'&price='+price.toFixed(2);
                }else{
                    window.location.href = '/view/pay/pay.html?shop='+shop+'&order='+ordernumber+'&price='+price.toFixed(2);
                }
            }
        }, function(error) {
        });

    });

})