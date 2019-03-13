$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var login = getParams.login;
    var originalhref = $('#header a').attr('href');
    $('#header a').attr('href',originalhref+'?shop='+shop);
    var originalhref = $('.register-btn a').attr('href');
    $('.register-btn a').attr('href',originalhref+'?shop='+shop);
    var originalhref = $('.forget-btn a').attr('href');
    $('.forget-btn a').attr('href',originalhref+'?shop='+shop);
    var storage = window.localStorage;
    var today = new Date().getTime();
    console.log(today);
  /* $('#login-container').inputValidate({
        submit: {
            query: '#requestSubmit'
        },
        inputs: [{
            query: '#requestPassword',
            regexp: window.commonRegexp.password.regexp,
            message: window.commonRegexp.password.message,
            emptyMessage: window.commonRegexp.password.emptyMessage
        }]
    });*/
    //账号密码登陆
    $("#requestSubmit").click(function(){
        var submitBtn = $("#requestSubmit");
        var params = {};
        params.mobile = $('#requestMobile').val();
        params.password = $('#requestPassword').val();
        params.areaCode = '86';
        toggleLoading(true);
        var domain = 'http://localhost:1300';
        ajaxRequest(domain +'/api/user/login', params, 'post', function (data) {
            toggleLoading(false);
            if (typeof storage === 'object') {
                try {
                    storage.id_shopCookie = data.data.id;
                    storage.token_shopCookie = data.data.token;
                    storage.token_time = today;
                    window.location.href = '/view/PublicPage/center.html?shop='+shop;
                } catch (e) {
                    Storage.prototype._setItem = Storage.prototype.setItem;
                    Storage.prototype.setItem = function() {};
                    alert(lang('traceless'));//  'traceless':'请关闭无痕浏览',
                }
            }
        }, function (error, obj, defaultErrorHandler) {
            toggleLoading(false);
            defaultErrorHandler(error, obj);
        }, submitBtn);
    });
});

