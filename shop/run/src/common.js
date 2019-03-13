// 多语言方法
/*var lang = function(tag) {
    return window.languageResource[tag] || '';
};*/
var domain = 'http://localhost:1300/api';
$(function () {
    //求body的高度，需要使用ulite.js框架
    $('body').inputAction({
        global: true
    }).height($(window).height());
    // 常用正则
    /*
    window.commonRegexp = {
        'mobile': {
            'regexp': /^1[34578]{1}\d{9}$/,
            'emptyMessage': lang('common.02'),
        },
        'password': {
            // 'regexp': /^(?=^[a-zA-Z0-9]{6,20}$).*[a-zA-Z]+.*$/,
            'regexp': /^(?=.*?[a-zA-Z])(?=.*?[0-9])[a-zA-Z0-9]{6,20}$/,
            'message': lang('common.03'),
            'emptyMessage': lang('common.04'),
        },
        'imageCode': {
            'regexp': /^[0-9a-zA-Z]{4}$/,
            'message': lang('common.05'),
            'emptyMessage': lang('common.06'),
        },
        'address': /^.{1,255}$/,
        'vcode': {
            'regexp': /^\d{4}$/,
            'message': lang('common.07'),
            'emptyMessage': lang('common.08'),
        },
        'smsvcode': {
            'regexp': /^\w{6}$/,
            'message': lang('common.07'),
            'emptyMessage': lang('common.08'),
        },
        'username': {
            'regexp': /^.{1,15}$/,
            'message': lang('common.10'),
            'emptyMessage': lang('common.11'),
        }
    };
     */
});

var getArgs = function getArgs() {
        var args = {};
        var query = location.search.substring(1);
        // Get query string
        var pairs = query.split("&");
        // Break at ampersand
        for (var i = 0; i < pairs.length; i++) {
            var pos = pairs[i].indexOf('=');
            // Look for "name=value"
            if (pos == -1) {
                continue;
            }
            // If not found, skip
            var argname = pairs[i].substring(0, pos); // Extract the name
            var value = pairs[i].substring(pos + 1); // Extract the value
            value = decodeURIComponent(value); // Decode it, if needed
            args[argname] = value;
            // Store as a property
        }
        return args; // Return the object
};

// 显示或隐藏加载中动画
/* exported toggleLoading */
var toggleLoading = function (isShow) {
    if (isShow) {
        $('#loadingContainer').removeClass('hidden');
//        $('body').addClass('modal-open');
    } else {
        $('#loadingContainer').addClass('hidden');
//        $('body').removeClass('modal-open');
    }
};

//ajax异步请求
/* exported ajaxRequest */
var ajaxRequest = function (url, params, method, successcallback, errorcallback, obj) {
    if (method === null || method === '') {
        method = 'get';
    }
    if (obj !== undefined) {
        if (obj.attr('disabled') !== undefined) {//按钮有disabled，则不往下进行
            return false;
        }
        obj.attr('disabled', true);//按钮没有disabled，则添加disabled
    }
    $.ajax({
        url: url,
        data: params,
        type: method,
        cache: false,
        dataType: 'json',
        success: function (data) {
            if (obj !== undefined) {//成功后，把diabled去掉。
                obj.removeAttr('disabled');
            }
            if (parseInt(data.error)>0) {//后台报错，显示错误
                if (typeof errorcallback == 'function') {
                    errorcallback(data, obj, defaultErrorHandler);
                } else {
                    defaultErrorHandler(data, obj);
                }
            } else {
                if (typeof successcallback == 'function') {
                    successcallback(data, obj);
                } else {
                    window.location.reload();
                 /*   reload 方法，该方法强迫浏览器刷新当前页面。
                       语法：location.reload([bForceGet])参数： bForceGet， 可选参数， 默认为 false，从客户端缓存里取当前页。 true, 则以GET 方式，从服务端取最新的页面, 相当于客户端点击 F5("刷新")
                */
                }
            }
        },
        error: function (error) {
            if (obj !== undefined) {
                obj.removeAttr('disabled');
            }
            if (typeof errorcallback == 'function') {
                errorcallback(error, obj, defaultErrorHandler);
            } else {
                defaultErrorHandler(error, obj);
            }

        }
    });
};

//一般的ajax请求error处理
/* exported defaultErrorHandler */
var defaultErrorHandler = function (error, obj) {
    if (parseInt(error.error)>0) { //有错误，显示错误内容
        formInlineTip(obj, error.message);
    } else if (typeof error.message === 'undefined') {
        formInlineTip(obj, lang('common.12'));//    'common.12':'系统内部错误',
    } else {
        formInlineTip(obj, error.message);
    }
};

/* exported formInlineTip */
var formInlineTip = function (obj, info, type) {
    formInlineRight(obj);
    if (type === undefined) {
        type = 0;
    }
    // 检测data中是否定义了显示提示的另一个位置
    var tipObjectStr = $(obj).data('tip-object');
    var tipObject = $(tipObjectStr);
    var hasTipObject = tipObject.length !== 0;
    if (!hasTipObject) {
        tipObject = obj;
    }
    var formGroupObj = tipObject.parents('.form-group');
    var helpBlock = formGroupObj.find('.help-block');
    helpBlock.html(info);
    var tipClass = '';
    switch (type) {
        case 2:
            tipClass = 'has-warning';
            break;
        case 1:
            tipClass = 'has-success';
            break;
        case 0:
            tipClass = 'has-error';
            break;
        default:
            break;
    }
    // 根据tip的类型改变help颜色
    formGroupObj.addClass(tipClass);
    if (hasTipObject) {
        obj.parent().addClass(tipClass);
    }
};

/**
 * 去除表单help-block状态
 * @param  Object obj  jquery对象
 */
/* exported formInlineRight */
var formInlineRight = function (obj) {
    var formGroupObj = $(obj).parents('.form-group');
    formGroupObj.removeClass('has-error');
    formGroupObj.removeClass('has-warning');
    formGroupObj.removeClass('has-success');
    // 检测data中是否定义了显示提示的另一个位置
    var tipObjectStr = $(obj).data('tip-object');
    var tipObject = $(tipObjectStr);
    var hasTipObject = tipObject.length !== 0;
    if (hasTipObject) {
        formGroupObj = tipObject.parents('.form-group');
        formGroupObj.removeClass('has-error');
        formGroupObj.removeClass('has-warning');
        formGroupObj.removeClass('has-success');
    }
};

var isWechat = function() {
    var ua = navigator.userAgent.toLowerCase();
    if(ua.match(/MicroMessenger/i) == "micromessenger") {
        return true;
    } else {
        return false;
    }
};