$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var originalHref = $('#doc-header a').attr('href');
    $('#doc-header a').attr('href', originalHref + '?shop=' + shop);
    var storage = window.localStorage;
    var cookieId = storage.id_shopCookie;
    var cookieToken = storage.token_shopCookie;
    var swiper = new Swiper('.swiper-container', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        coverflowEffect: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows : true,
        },
        pagination: {
            el: '.swiper-pagination',
        },
    });
    toastr.options = {
        "newestOnTop": false,
        "timeOut": 1500,
        "extendedTimeOut": 0,
        "escapeHtml": true,
        "positionClass": "toast-bottom-center"
    };
    $(".shop-classify").click(function(e){
        e.stopPropagation();
        $('.classify-content').stop(true).animate({width:'6rem'},100,function(){
            $('html,body').addClass('overflowHiden');
            $('#mask-body').removeClass('hidden');
        });
    });
    $('#mask-body').on('click',function(e){
        e.stopPropagation();
        $('.classify-content').stop(true).animate({width:'0'},100,function(){
            $('#mask-body').addClass('hidden');
            $('html,body').removeClass('overflowHiden');
        });
    });
    toggleLoading(true);
    var docBody = $('#doc-body');
    var managePanel = $('#manage-panel');
    var domain = 'http://localhost:1300/api';
    //店铺介绍
    ajaxRequest(domain+'/shop/intro/'+shop, {}, 'get', function(data) {
        toggleLoading(false);
        var info = data.data;
        $('title').text(info.shopname);
        $('.navbar-title').text(info.shopname);
        docBody.find('.swiper-container .cover-images').attr("src",info.shoplogo);
        managePanel.find('.main-pic').css("background-image","url("+info.managerhead+")").css("background-size","100% 100%");
        managePanel.find('.collect').text(info.like);
        managePanel.find('.stores-description').text(info.shopdescription);
        managePanel.find('.hotel-panel-special').html(info.note.content);
        managePanel.find('.stores-panel-address').html(info.shopaddress);
        managePanel.find('.stores-panel-mobile').html(info.managermobile);
        managePanel.find('.stores-panel-wechat').html(info.managerwechat);
        managePanel.find('.hotel-panel-contact').html(info.managername);
        managePanel.find('.background-cover').attr("src",info.note.cover);
        if(parseFloat(info.charity)>0){
            /*义卖金额大于0就显示出来*/
            managePanel.find('.rummageSale-box').removeClass('hidden');
            managePanel.find('.rummageSale').text(info.charity);
        }
        var LabelHTML = '';
        $.each(info.label, function(key, value) {
            var templateLabelHTML = $($('#templateLabel').clone().html());
            templateLabelHTML.html(value);
            LabelHTML += templateLabelHTML.prop('outerHTML');
        });
        managePanel.find('.sign-content').html(LabelHTML);
        $('#doc-foot .shop-contact').attr('href', 'tel:' + info.managermobile);
        $('.swiper-container').on('click','.cover-images',function(e){
            e.stopPropagation();
        });
    }, function(error) {
        toggleLoading(false);
    });
    /*展开店铺信息*/
    docBody.on('click', '.stores-more-info-trigger', function(e) {
        e.preventDefault();//preventDefault() 方法阻止元素发生默认的行为（例如，当点击提交按钮时阻止对表单的提交）。
        var trigger = $(this);
        if (trigger.hasClass('revert')) {
            $('#manage-panel .stores-more-info').addClass('hidden');
        } else {
            $('#manage-panel .stores-more-info').removeClass('hidden');
        }
        trigger.toggleClass('revert');//revert用于控制旋转。
        // 该方法检查每个元素中指定的类。如果不存在则添加类，如果已设置则删除之。这就是所谓的切换效果。
    });
    var getGoodsRequest = function(){
        var params = {};
        params.id = cookieId;
        params.token = cookieToken;
        ajaxRequest(domain+'/goods/show/'+shop, {}, 'post', function(data) {
            toggleLoading(false);
            var info = data.data;
            var recommendHTML = '';
            var hotSaleHTML = '';
            var recommendNum = 0;
            var hotSaleNum = 0;
            $.each(info.recommend, function(key, value) {
                var templateRecommendHTML = $($('#templateGoodsContent').clone().html());
                templateRecommendHTML.attr('data-id',value.id);
//                templateRecommendHTML.attr('data-recommend',value.recommend);
                templateRecommendHTML.find('.shop-dec').text(value.name);
                templateRecommendHTML.find('.shopPirce').text(parseFloat(value.price).toFixed(2));
                templateRecommendHTML.find('.shopSales').text(value.sales);
                var imgUrl = "http://booking.uclbrt.com/api/uploads/goodsImage/20170815/539eeeb2e4adedb795b36c6fb4f763b6.jpg";
                templateRecommendHTML.find('.shop-cover').css({"background-image":"url("+imgUrl+")","background-size":"cover","background-position":"center"});

                if(recommendNum >= 2){
                    templateRecommendHTML.addClass('hidden');
                }else{
                    //第一个和第二框的下边框没有
                    templateRecommendHTML.addClass('borderNone');
                }
                recommendHTML += templateRecommendHTML.prop("outerHTML");
                recommendNum++;
            });
            $.each(info.hotSale, function(key, value) {
                var templateHotSaleHTML = $($('#templateGoodsContent').clone().html());
                templateHotSaleHTML.attr('data-id',value.id);
//                templateHotSaleHTML.attr('data-recommend',value.recommend);
                templateHotSaleHTML.find('.shop-dec').text(value.name);
                templateHotSaleHTML.find('.shopPirce').text(parseFloat(value.price).toFixed(2));
                templateHotSaleHTML.find('.shopSales').text(value.sales);
                var imgUrl = "http://booking.uclbrt.com/api/uploads/goodsImage/20170815/539eeeb2e4adedb795b36c6fb4f763b6.jpg";
                templateHotSaleHTML.find('.shop-cover').css({"background-image":"url("+imgUrl+")","background-size":"cover","background-position":"center"});

                if(hotSaleNum >= 2){
                    templateHotSaleHTML.addClass('hidden');
                }else{
                    //第一个和第二框的下边框没有
                    templateHotSaleHTML.addClass('borderNone');
                }
                hotSaleHTML += templateHotSaleHTML.prop("outerHTML");
                hotSaleNum++;
            });
            $("#shop-panel").find("#shopContent").html(recommendHTML);
            $("#shop-panel").find("#hotsaleContent").html(hotSaleHTML);
        }, function(error) {
            toggleLoading(false);
        });
    }
    getGoodsRequest();
    $('.content-panel').on('click','.more',function(e){
        e.stopPropagation();
        $(this).text('没有更多了').closest('.content-panel').find('.shopItem').removeClass('hidden borderNone');
    });
    $('#shop-panel').on('click','.shopItem',function(e){
        e.stopPropagation();
        var btn = $(this);
        window.location.href = '/view/details/details.html?shop='+shop+'&id='+btn.data('id')+'&index=1';
    });
    $('.classify-mian').on('click',function(e){
        e.stopPropagation();
        var btn = $(this);
        var mianRight = btn.find('.mian-right');
        var shopContent =btn.closest('.shop-content').find('.shop-list-content');
        var otherMianRight = btn.closest('.shop-content').siblings('.shop-content').find('.mian-right');
        var otherShopContent = btn.closest('.shop-content').siblings('.shop-content').find('.shop-list-content');
        otherMianRight.removeClass('revert');
        otherShopContent.slideUp();
    });

})