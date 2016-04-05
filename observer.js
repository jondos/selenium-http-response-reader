var {Cc, Ci, Cr} = require("chrome");

var workers = [];
var possible_headers = [];
var currURL = "false";
var currPath = "false";

var ProtocolVersion = "";
var ReasonPhrase = "";
var StatusCode = "";

var requestsDone = 0;

var currURL_getter = {

  getter: function(mode){
    if(mode == 0){
      return currURL;
    }
    else if(mode == 1){
      return currPath;
    }
  }
  
}

var workers_setter = {

  setter: function(array){
    workers = array;
  }
  
}

function getHostfromURL(url){

  if(url.indexOf("://") > -1){
  
    url = url.substring(url.indexOf("://")+3, url.length);
    
    if(url.indexOf("/") > -1){
    
      url = url.substring(0, url.indexOf("/"));
    
    }
  
  }
  else{
  
    if(url.indexOf("/") > -1){
    
      url = url.substring(0, url.indexOf("/"));
    
    }
  
  }
  
  return url;

}

var iterater = {

  iterate_over_workers: function(){
  
    for(var i = 0; i < workers.length; i++){
        
      console.log("TESTING WORKER ID: " + i);
        
      workers[i].port.emit("check", currURL);
      workers[i].port.on("check_back", function(value){
        if(value == "YES"){
          
          for(var ii = 0; ii < possible_headers.length; ii = ii+4){
          
            if(possible_headers[ii] == getHostfromURL(workers[i-1].url)){
            
              workers[i-1].port.emit("getProto", "Failed/NotFound");
              workers[i-1].port.emit("getReason", possible_headers[ii+2]);
              workers[i-1].port.emit("getStatus", possible_headers[ii+3]);
              workers[i-1].port.emit("getPath", "httprO: " + possible_headers[ii] + currPath + " || worker: " + workers[i-1].url);
            
              workers[i-1].port.emit("isAllowed", "YES");
              
              console.log("YEAH from: (worker) " + workers[i-1].url + " || (poss) " + possible_headers[ii]);
            
            }
            else{
            
              console.log("TESTED: " + possible_headers[ii] + " (not equals " + getHostfromURL(workers[i-1].url) + ")");
            
            }
          
          }
          
          possible_headers = [];
                          
         }
         else{
            
           console.log("value: " + value + " != " + currURL);
            
         }
       });
        
    }
  
  }

}

var requestsDone_setter = {

  set_setter: function(value){
  
    requestsDone = value;
  
  }

}

/*
* This is code from the 'old' XPI and should always work if NOT in Uittest Mode
*/
function getDOMWindow(channel){

  var notificationCallbacks;
  var wind = null;
  var loadGroupNot = false;

  if (channel.notificationCallbacks) {

    notificationCallbacks = channel.notificationCallbacks;

  } else {

    if (channel.loadGroup) {

      notificationCallbacks = channel.loadGroup.notificationCallbacks;
      loadGroupNot = true;

    } else {

      notificationCallbacks = null;

    }
  }

  if (!notificationCallbacks) {

    //console.log("We found no Notificationcallbacks! Returning null...");

  } else {

    try {

      wind = notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;

    } catch (e) {

      // If we aren't here because the loadGroup notificationCallbacks got
      // used and we get the loadGroup check them. That is e.g. needed for
      // CORS requests. See:
      // https://trac.torproject.org/projects/tor/ticket/3739

      if (!loadGroupNot && channel.loadGroup) {

        notificationCallbacks = channel.loadGroup.notificationCallbacks;

        try {

          wind = notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;

        } catch (e) {

          //console.log("Error while trying to get the Window for the second time: " + e);

        }
      }
    }
  }

  return wind;

}

/*
* This function tries to get the parent Host, meaning the Website the Browser has opened
* in the current Window/Tab (so that scripts loaded from the Website hosted on a different
* host are third party Hosts)
*
* Tries to identify the parent Host via:
*  - DOMWindow
*  - Cookie?
*  - Referrer
*
* This code is from the 'old' XPI
*/
function getParentHost(channel) {

  var wind;
  var parentHost = null;
  wind = this.getDOMWindow(channel);

  if (wind) {

    try {

      parentHost = wind.top.location.hostname;

      return parentHost;

    } catch (ex) {

      //console.log("nsIDOMWindow seems not to be available here!");

    }

  }

  // We are still here, thus something went wrong. Trying further things.
  // We can't rely on the Referer here as this can legitimately be
  // 1st party while the content is still 3rd party (from a bird's eye
  // view). Therefore...

  try {

    //I still dont know how to get this to work...

    parentHost = cookiePerm.getOriginatingURI(channel).host;
    //console.log("Used getOrigingURI! And parentHost is: " + parentHost + "\n");

    return parentHost;

  } catch (e) {

    //console.log("getOriginatingURI failed as well: " + e + "\nWe try our last resort the Referer...");

  } finally {

    // Getting the host via getOriginatingURI failed as well (e.g. due to
    // browser-sourced favicon or safebrowsing requests or the method not
    // being available in Gecko > 17). Resorting to the Referer.

    if (channel.referrer) {

      parentHost = channel.referrer.host;

    } else {

      //console.log("No Referer either. Could be 3rd party interaction though.");

    }

  }

  return parentHost;

}

var detacher = {

  detachWorker: function(worker, workerArray) {
    var index = workerArray.indexOf(worker);
    if(index != -1) {
      workerArray.splice(index, 1);
    }
  }
}

/*
* The observer to get the 'http-on-examine-response' trigger used to intercept
* incoming HTTP Headers (so we can remove the 'WWW-Authenticate' Header flag
* to block the Authentication-ID security flaw if it is set by a third party Website)
*/
var httpRequestObserver = {

  /*
  * This function executes when the Observer gets triggered
  */
  observe: function(subject, topic, data){

    // If it is a Server->Client Response
    if(topic == "http-on-examine-response") {

      var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      
      var parentHost = getParentHost(httpChannel);
      
      console.log(parentHost + " || " + httpChannel.URI.host);
      
      //currURL = "false";
      //currPath = "false";
      
      if(parentHost && parentHost == httpChannel.URI.host){
      
        currURL = httpChannel.URI.host;
        currPath = httpChannel.URI.path;
      
        try{
          if(httpChannel.getResponseHeader("GET") != 0x80040111){
        
            ProtocolVersion = httpChannel.getResponseHeader("ProtocolVersion");
        
          }
        }
        catch(e){
          if(e.result == Cr.NS_ERROR_NOT_AVAILABLE){
            ProtocolVersion = "Failed/Not Found";
          }
        }
        try{
          ReasonPhrase = httpChannel.responseStatusText;
        }
        catch(e){
          if(e.result == Cr.NS_ERROR_NOT_AVAILABLE){
            ReasonPhrase = "Failed/Not Found";
          }
        }
        try{
          StatusCode = httpChannel.responseStatus;
        }
        catch(e){
          StatusCode = "Failed/Not Found";
        }
        
        requestsDone = requestsDone + 1;
      
      }
      else{
      
        if((httpChannel.URI.host && requestsDone == 0) || possible_headers.length == 0){
        
          possible_headers.push(httpChannel.URI.host); //handle subdomains here
          possible_headers.push(httpChannel.URI.path);
          possible_headers.push(httpChannel.responseStatusText);
          possible_headers.push(httpChannel.responseStatus);
          
          console.log("HEADER: " + httpChannel.URI.host);
        
        }
      
      }

    }

  },
  
  get observerService(){
    return Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  },

  register: function(){
    this.observerService.addObserver(this, "http-on-examine-response", false);
  },

  unregister: function(){
    this.observerService.removeObserver(this, "http-on-examine-response");
  }

};

exports.httpRequestObserver = httpRequestObserver;
exports.detacher = detacher;
exports.currURL_getter = currURL_getter;
exports.workers_setter = workers_setter;
exports.iterater = iterater;
exports.requestsDone_setter = requestsDone_setter;