//判断是否在微信的登陆：
var isWechat = function() {
    var ua = navigator.userAgent.toLowerCase();
    if(ua.match(/MicroMessenger/i) == "micromessenger") {
        return true;
    } else {
        return false;
    }
};
//因为javascript中的时间差值为时间戳，即毫毛数,一天86400000
function GetElapsedDay(year, month, day)
{
    var dt = new Date(year, month, day);
    var today = new Date();
    return parseInt((today.getTime() - dt.getTime())/86400000);
}