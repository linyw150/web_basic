$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var type = getParams.type;
    var typeId = getParams.typeId;
    var num = getParams.num;
    var goodsSkuId = getParams.goodsSkuId;
    var goodsSkuidarr = getParams.goodsSkuidarr;
    var originalHref = $('#noLogining a').attr('href');
    $('#noLogining a').attr('href', originalHref + '?shop=' + shop);
    var originalHref = $('#doc-header a').attr('href');
    if(goodsSkuId){
        $('#doc-header a').attr('href', '/shop/cart/confirm.html?shop='+shop+'&num='+num+'&goodsSkuId='+goodsSkuId+'&typeId='+typeId);
    }else if(goodsSkuidarr){
        $('#doc-header a').attr('href', '/shop/cart/confirm.html?shop='+shop+'&goodsSkuidarr='+goodsSkuidarr);
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
    if(cookieId){
        $('#doc-body').removeClass('hidden');
        toggleLoading(true);
        var params = {};
        params.id = cookieId;
        params.token = cookieToken;
        ajaxRequest(domain+'/address/show', params, 'post', function(data) {
            toggleLoading(false);
            var info = data.data;
            var addressOrderHTML = '';
            if(info.length>0){
                $.each(info, function(key, value) {
                    var templateAddressHTML = $($('#templateOrder').clone().html());
                    templateAddressHTML.attr('data-id',value.id);
                    templateAddressHTML.find('.info-address').text(value.address);
                    templateAddressHTML.find('.info-num').text(value.mobile);
                    templateAddressHTML.find('.info-name').text(value.name);
                    if(value.default == 1){
                        templateAddressHTML.find('.default-btn').addClass('isChecked');
                    }
                    addressOrderHTML += templateAddressHTML.prop('outerHTML');
                });
            }else{
                addressOrderHTML = $('#templateOrderEmpty').clone().html();
            }
            $('.addresslist-content').html(addressOrderHTML);
        }, function(error) {
        });
    }else{
        $('#noLogining').removeClass('hidden');
    }
})