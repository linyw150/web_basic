$(function(){
    var getParams = getArgs();
    var shop = getParams.shop;
    var originalHref = $('#doc-header .info-back').attr('href');
    $('#doc-header .info-back').attr('href', originalHref + '?shop=' + shop);
    var storage = window.localStorage;
    var cookieId = storage.id_shopCookie;
    var cookieToken = storage.token_shopCookie;
    var docBody = $('#doc-body');
    if(cookieId) {
        var params = {};
        params.id = cookieId;
        params.token = cookieToken;
        var domain = 'http://localhost:1300';
        ajaxRequest(domain + '/api/account/edit', params, 'post', function (data) {
            var info = data.data;
            docBody.find('.head-portrait').css('background-image',"url("+info.headpath+")").css("background-size","100% 100%");
            docBody.find('.moblie').text(info.mobile);
            docBody.find('.user').text(info.name);
            var pc = new PhotoClip('#clipArea', {
                size: 260,
                outputSize: 640,
                file: '#file',
                view: '#view',
                ok: '#clipBtn',
                img: info.headpath,
                loadStart: function() {
                    toggleLoading(true);
                },
                loadComplete: function() {
                    toggleLoading(false);
                },
                loadError:function(){
                    toggleLoading(false);
                },
                done: function(dataURL) {
                    var params = {};
                    params.id = cookieId;
                    params.token = cookieToken;
                    params.baseImage = dataURL;
                    console.log(dataURL);
                    toggleLoading(true);
                    ajaxRequest(domain+'/api/account/updateHead', params, 'post', function(data) {
                        toggleLoading(false);
                        var info = data.data;
                        window.location.reload();//刷新页面
                    }, function(error) {
                        toggleLoading(false);
                        toastr.error(typeof error.message === 'undefined' ? lang('serverbusy') : error.message);
                    });
                },
                fail: function(msg) {
                    alert(msg);
                }
            });
            $('.change-headPic').on('click',function(){
                $('.info-content-box').addClass('hidden');
                $('.img-content').removeClass('hidden');
//                $('.navbar-title').text(lang('info01'));
                $('#doc-header .info-back').addClass('hidden');//显示info“个人信息”
                $('#doc-header .img-back').removeClass('hidden');//隐藏箭头
                $('#doc-header .info-compile').addClass('hidden');//隐藏右侧占用的div
                $('#doc-header .img-compile').removeClass('hidden');//显示右侧占用的div（文字使用）
                var documentheight = $(window).height();
                console.log(documentheight);
                var docheight = $('#doc-header').height();
                var clipAreaheight = parseFloat(documentheight-docheight);
                $('#clipArea').css('height',clipAreaheight);
            });
        }, function (error) {

        });
    }
    $('.login-out').on('click',function(){
        storage.clear();
        window.location.href = '/view/PublicPage/center.html?shop='+shop;
    });



});