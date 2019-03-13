var deviceWidth = document.documentElement.clientWidth;
if(deviceWidth > 414) deviceWidth = 540; 
document.documentElement.style.fontSize = deviceWidth / 7.5 + 'px';