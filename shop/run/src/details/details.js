$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var typeId = getParams.id;
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

    var docBody = $("#doc-body");
    var versionContent = $('.version-content');
    if(cookieId){
        var params = {};
        params.id = cookieId;
        params.token = cookieToken;
        params.goodsId = typeId;
        ajaxRequest(domain+'/goods/detail/'+shop,params,'post',function(data){
            toggleLoading(false);
            var info = data.data;
            if(info.like){
                $('#doc-foot .shop-enshrine .icon').addClass('icon-heart');
            }
            var swiperHTML = '';
            if(info.img){
                $.each(info.img,function(key,value){
                    var templateSwiperHTML = $($('#templateSwiper').clone().html());
                    templateSwiperHTML.attr('data-id',value.id);
                    templateSwiperHTML.find('.cover-images').css({"background-image":"url("+value.imgurl+")","background-size":"cover","background-position":"center"});
                    swiperHTML += templateSwiperHTML.prop('outerHTML');
                });
                docBody.find(".swiper-wrapper").html(swiperHTML);
            }
            var goods = info.goods;
            docBody.find('.sales-volume').text(goods.sales);
            docBody.find('.referral').text(goods.name);
            docBody.find('.referral-price .price').text(goods.price);
            docBody.find('.details-container .details').html(goods.detail);
            var skuNum = 0;
            var sizeHTML = '';
            $.each(info.sku,function(key,value){
                var templateSizeHTML = $($('#templateSizeContent').clone().html());
                if(skuNum == 0){
                    templateSizeHTML.addClass('active');
                }
                versionContent.find('.price').text(info.sku[0].price);
                versionContent.find('.repertory').text(info.sku[0].stock);
                skuNum++;
                templateSizeHTML.text(value.modelnumber);
                templateSizeHTML.attr('data-id',value.id);
                templateSizeHTML.attr('data-price',value.price);
                templateSizeHTML.attr('data-stock',value.stock);
                sizeHTML += templateSizeHTML.prop('outerHTML');
            })
            versionContent.find('.size-content').html(sizeHTML);
            var swiper = new Swiper('.swiper-container', {
                pagination: '.swiper-pagination',
                effect: 'coverflow',
                grabCursor: true,
                centeredSlides: true,
                slidesPerView: 'auto',
                pagination: '.swiper-pagination',
                autoplayDisableOnInteraction : false,
                autoplay:3000,
                coverflow: {
                    rotate: 50,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows : true
                }
            });
        },function(){

        })
    }
    $('.gift-container,.addToCart,.buyImmediately').on('click',function(e){
        e.stopPropagation();
        $('.version-content').stop(true).animate({height:'8.4rem'},function(){
            $('html,body').addClass('overflowHiden');//不出现滚动条
            $('#mask-body').removeClass('hidden');
        });
    });
    $('#mask-body,.version-close').on('click',function(e){
        //点击mask-body可使页面隐藏
        e.stopPropagation();
        $('.version-content').stop(true).animate({height:'0'},function(){
            $('#mask-body').addClass('hidden');
            $('html,body').removeClass('overflowHiden');
        });
    });
    $('.size-content').on('click','.size-list',function(){
        var btn = $(this);
        var price = btn.data('price');
        var stock = btn.data('stock');//库存写入商品分类上
        btn.addClass('active').siblings('.size-list').removeClass('active');
        btn.closest('.version-content').find('.price').text(price);//商品价格
        btn.closest('.version-content').find('.repertory').text(stock);//库存
        $('#shopSum').val(1);
    });
    $("#buyImmediately").on('click',function(e){
        e.stopPropagation();
        var num = $('#shopSum').val();
        var sizeList = $('.version-content .size-list');
        for(var i=0;i<sizeList.length;i++){
            if(sizeList.eq(i).hasClass("active")){
                var goodsSkuId = sizeList.eq(i).data('id')
            }
            window.location.href = '/view/cart/confirm.html?shop='+shop+'&num='+num+'&goodsSkuId='+goodsSkuId+'&typeId='+typeId;
        }
    });


});