$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var typeId = getParams.typeId;
    var num = getParams.num;
    var goodsSkuId = getParams.goodsSkuId;
    var addressId = getParams.addressId;
    var goodsSkuidarr = getParams.goodsSkuidarr;
    var originalHref = $('#doc-header a').attr('href');
    var wrong = $('.wrong');
    var storage = window.localStorage;
    var cookieId = storage.id_shopCookie;
    var cookieToken = storage.token_shopCookie;
    if(goodsSkuId){
        $('#doc-header a').attr('href', '/view/cart/addresslist.html?shop='+shop+'&num='+num+'&goodsSkuId='+goodsSkuId+'&typeId='+typeId);
    }else if(goodsSkuidarr){
        $('#doc-header a').attr('href', '/view/cart/addresslist.html?shop='+shop+'&goodsSkuidarr='+goodsSkuidarr);
    }else{
        $('#doc-header a').attr('href', originalHref + '?shop=' + shop);
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
    var getLinkJump = function(){
        if(goodsSkuId){
            window.location.href = '/shop/cart/addresslist.html?shop='+shop+'&num='+num+'&goodsSkuId='+goodsSkuId+'&typeId='+typeId;
        }else if(goodsSkuidarr){
            window.location.href = '/shop/cart/addresslist.html?shop='+shop+'&goodsSkuidarr='+goodsSkuidarr;
        }else{
            window.location.href = '/shop/cart/addresslist.html?shop='+shop;
        }
    }
    if(addressId){
        $('.del-address').removeClass('hidden');
    }

})