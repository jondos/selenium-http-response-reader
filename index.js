var self = require('sdk/self');

var requests = require("./observer.js");
var pageMod = require("sdk/page-mod");

var workers = [];

pageMod.PageMod({
  include: "*",
  contentScriptFile: "./applyHTMLchange.js",
  onAttach: function(worker){
    var currURL = requests.currURL_getter.getter(0);
    var currPath = requests.currURL_getter.getter(1);
    
    if(currURL != "false"){
    
      worker.port.emit("isAllowed", currURL);
            
      workers.push(worker);
    
      requests.workers_setter.setter(workers);
              
      console.log("ADDED (" + currURL + ") [" + currPath + "]");
    
      requests.iterater.iterate_over_workers();
    
    }
              
    worker.on('detach', function(){
      requests.detacher.detachWorker(this, workers);
      requests.requestsDone_setter.set_setter(0);
      requests.workers_setter.setter(workers);
      console.log("DETACHED");
    });
  }
});

/*
* Initiate Observers here
*/
requests.httpRequestObserver.register();
