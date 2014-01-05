Array.prototype.last = function(){
    var len = this.length;
    if(len > 0)
        return this[len - 1];
    return false;
};

var DEBUG = new function(){
    var lastLongMes = false;
    this.log = function(){
        if(console && console.log){
            console.log.apply(console, arguments);
            return true;
        }
        return false;
    };
    this.logLongMessage = function(explain, message){
        this.log(explain + "\n(Long message received. Type \"DEBUG.lastLong()\" to see it)");
        lastLongMes = message;
    };
    this.lastLong = function(){
        if(lastLongMes){
            this.log(lastLongMes);
        }else{
            this.log("No long messages received yet...");
        }
            
    };
    this.vartype = function(vars){
        alert(typeof vars + '('+vars+')');
    };
    this.markDeprecated = function(){
        try {
            throw new Exception('WARNING: Deprecated function was used!');
        }catch(e){
            this.printStackTrace(e);
        }
    };
    this.printStackTrace = function(e){
        var callstack = [];
        var isCallstackPopulated = false;

        if (e.stack) { //Firefox
            var lines = e.stack.split("\n");
            for (var i=0, len=lines.length; i<len; i++) {
                callstack.push(lines[i]);
            }
            //Remove call to printStackTrace()
    //        callstack.shift();
    //        callstack.push(e.stack);
            isCallstackPopulated = true;
        }
        else if (window.opera && e.message) { //Opera
            var lines = e.message.split("\n");
            for (var i=0, len=lines.length; i<len; i++) {
                var entry = lines[i];
                //Append next line also since it has the file info
                if (lines[i+1]) {
                    entry += ' at ' + lines[i+1];
                    i++;
                }
                callstack.push(entry);
            }
            //Remove call to printStackTrace()
            callstack.shift();
            isCallstackPopulated = true;
        }

        if (!isCallstackPopulated) { //IE and Safari
            var currentFunction = arguments.callee.caller;
            while (currentFunction) {
                var fn = currentFunction.toString();
                var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
                callstack.push(fname);
                currentFunction = currentFunction.caller;
            }
        }
        console.log('Error happened:');
        console.log(e);
        alert((e.message?e.message+':\n\n':'') +callstack.join('\n\n'));
    };
   
};
function debug(obj){
    DEBUG.log(obj);
}
function debug_var(vars){
    DEBUG.vartype(vars)
}

function printStackTrace(e) {
    DEBUG.printStackTrace(e);
}


var Lib = new function(){
    var self = this;
    
    this.isArray = Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
    };
    
    this.is = function(obj, type){
        if (!type) {
            return obj !== undefined;
        }

        if (type === 'array' && this.isArray(obj)) {
            return true;
        }

        return typeof(obj) === type;
    };
    
    function PromiseObject(){
        this.toString = function(){
            return 'PromiseObject';
        };
    };
    
    function ChainBreakExc(){
        var args = arguments;
        return new function(){
            this.toString = function(){
                return 'ChainBreakException';
            };
            this.errdata = [];
            for (var i = 0; i < args.length; i++)
                this.errdata.push(args[i]);
            
        };
    };
    
    function Promise(id){
        var c = [], e = [], promise, anyway_cb, data;
        
        function fireAnyway(){
            if(anyway_cb){
                anyway_cb();
                return true;
            }
            return false;
        }
        
        PromiseObject.prototype = {
            resolve: function(){
                var res, resarr = [], local_promises = [], i;
                
                for(i = 0; i < c.length; i++){
                    if(self.is(c[i], 'function')){
                        try {
                            res = c[i].apply(this, arguments);
                        }catch(e){
                            if(e && e.toString && e.toString() === 'ChainBreakException'){
                                this.error.apply(this, e.errdata);
                                return;
                            }else{
                                throw e;
                            }
                        }
                        if(Promise.isPromise(res)){
                            local_promises.push(res);
                        }else if(self.is(res)){
                            resarr.push(res);
                        }
                        
                    }
                }
                
                //alert('resarr of ' + this.getId() + ': ' + resarr);
                if(local_promises.length > 0){
                    Promise.join(local_promises).done(function(data){
                        //resarr.push(data);
                        fireAnyway();
                        if(promise) promise.resolve.call(promise, data);
                    }).fail(function(edata){
                        //alert('joined promises error: ' + edata);
                        fireAnyway();
                        if(promise) promise.error(edata);
                    });
                }else{
                    
                    fireAnyway();
                    if(promise) promise.resolve.apply(promise, resarr);
                }
                    
            },
            stop: function(){
                throw ChainBreakExc.apply(this, arguments);
            },
            error: function(){
                var i;
                //alert('failed promise ' + this.getId());
                for(i = 0; i < e.length; i++){
                    if(self.is(e[i], 'function')){
                        e[i].apply(this, arguments);
                        
                    }
                }
                
                
                fireAnyway();
                if(promise) promise.error.apply(promise, arguments);
            },
            then: function(cf, ef){
                promise = self.Promise();
                
                function addTo(dest, cbarr){
                    if(self.isArray(cbarr))
                        for(var i = 0; i < cbarr.length; i ++)
                            dest.push(cbarr[i]);
                    else
                        dest.push(cbarr);
                }
                
                addTo(c, cf);
                addTo(e, ef);
                return promise;
            },
            done: function(){
                for(var i = 0; i < arguments.length; i++){
                    c.push(arguments[i]);
                }
                return this;
            },
            fail: function(){
                for(var i = 0; i < arguments.length; i++){
                    e.push(arguments[i]);
                }
                return this;
            },
            anyway: function(cb){
                if(self.is(cb, 'function'))
                    anyway_cb = cb;
                return this;
            },
            getDoneFunctions: function(){
                return c;
            },
            getErrorFunctions: function(){
                return e;
            },
            getId: function(){
                return id;
            },
            setId: function(ids){
                id = ids;
                return this;
            }
        };
        var po = new PromiseObject();
        po.constructor = PromiseObject;
        return po;
    };
    
    Promise.isPromise = function(promise){
        //if(promise && promise.toString && promise.toString() == 'PromiseObject'){
        //console.log(promise.constructor);
        if(promise && promise.constructor === PromiseObject){
        //if(promise instanceof PromiseObject){
            return true;
        }
        return false;
    };
    
    Promise.join = function(promises){
        var i, resarr = [], errarr = [], count = promises.length, success_count = 0, fail_count = 0, joinedp = Promise();
        
        //joinedp.setId('joined promise');
        for (i = 0; i < promises.length; i++){
            if (Promise.isPromise(promises[i])){
                promises[i].then().setId('#' + i + ' from joined promise').done(function(){
                    //console.log('joined arguments of ' + this.getId() + ': ', arguments);
                    success_count++;
                    resarr.push({promise: this, data: []});
                    for(i = 0; i < arguments.length; i ++){
                        resarr.last().data.push(arguments[i]);
                    }
                }).fail(function(){
                    fail_count++;
                    errarr.push({promise: this, error: []});
                    
                    for(i = 0; i < arguments.length; i ++){
                        errarr.last().error.push(arguments[i]);
                    }
                    
                }).anyway(function(){
                    if(--count === 0 && success_count > 0){
                        joinedp.resolve(resarr, [success_count, fail_count]);
                    }else if(count === 0){
                        joinedp.error.apply(joinedp, errarr);
                    }
                });
            }
        }
        
        return joinedp;
    };
    
    this.Promise = Promise;
    
    this.postData = function(data, options){
        var settings = {
            datatype: 'text',
            url: 'admin.json'
        }, p =  new Lib.Promise();
        $.extend(settings, options);
        
        debug('Load begin.');
        (function post(){
            jQuery.ajax({
                async: true,
                url: settings.url,
                data: data,
                type: 'POST',
                dataType: settings.datatype,
                success: function(data, status)
                {
                    DEBUG.logLongMessage('Load complete. Answer: ', data);
                    
                    p.resolve(data);
                    
                },
                error: function(a,b,c){
                    DEBUG.log('Load completed with error:');
                    DEBUG.log(c + "\n------\n" + a.responseText);
                    
                    p.error(c);
                }
            });
        })();

        return p;
    };
};