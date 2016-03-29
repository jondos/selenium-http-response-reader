var text = "abc";
var path = "def";

var getProto;
var getReason;
var getStatus;

self.port.on("getProto", function(value1){
  getProto = value1;
});

self.port.on("getReason", function(value2){
  getReason = value2;
});

self.port.on("getStatus", function(value3){
  getStatus = value3;
});

self.port.on("getPath", function(value7){
  path = value7;
});

self.port.on("isAllowed", function(value0){
  
  if(value0 == "YES"){
  
    if(getProto != undefined && getReason != undefined && getStatus != undefined){
  
      document.body.innerHTML = document.body.innerHTML + "<p>" + value0 + " (" + getProto + " | " + getReason + " | " + getStatus + ") [" + path + "]</p>";
      //document.body.innerHTML = "HAHA";
  
    }
  
  }
  else{
  
    text = value0;
  
  }
  
});

self.port.on("check", function(value5){
  if(value5 == text){
    self.port.emit("check_back", "YES");
  }
  else{
    self.port.emit("check_back", text);
  }
});