/*
 * Copyright 2014 Alexander Gilevich

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

Array.prototype.last = function(){
    var len = this.length;
    if(len > 0)
        return this[len - 1];
    return false;
};

var DEBUG = new function(){
    var lastLongMes = false, enabled = false;
    this.enable = function(bool){
        enabled = !!bool;
    };
    
    this.log = function(){
        if(enabled && console && console.log){
            console.log.apply(console, arguments);
            return true;
        }
        return false;
    };
    this.logLongMessage = function(explain, message){
        if(!enabled){
            return false;
        }
        
        this.log(explain + "\n(Long message received. Type \"DEBUG.lastLong()\" to see it)");
        lastLongMes = message;
    };
    this.lastLong = function(){
        if(!enabled){
            return false;
        }
        
        if(lastLongMes){
            this.log(lastLongMes);
        }else{
            this.log("No long messages received yet...");
        }
            
    };
    this.vartype = function(vars){
        if(!enabled){
            return false;
        }
        
        alert(typeof vars + '('+vars+')');
    };
    this.markDeprecated = function(){
        if(!enabled){
            return false;
        }
        
        try {
            throw new Exception('WARNING: Deprecated function was used!');
        }catch(e){
            this.printStackTrace(e);
        }
    };
    this.printStackTrace = function(e){
        if(!enabled){
            return false;
        }
        
        var callstack = [];
        var isCallstackPopulated = false;

        if (e.stack) { //Firefox
            var lines = e.stack.split("\n");
            for (var i=0, len=lines.length; i<len; i++) {
                callstack.push(lines[i]);
            }
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
        this.log('Error happened:', e);
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

var FL, FlyLib = FL = new function(){
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
    
    function exceptionChainBreak(errdata, terminate){
        this.errdata = errdata;
        this.terminate = terminate;
    }
    
    function exception(excObj){
        throw new excObj( Array.prototype.slice.call( arguments, 1 ));
    };
    
    function PromiseObject(){
        this.toString = function(){
            return 'PromiseObject';
        };
        
        this.c = [];
        this.e = [];
        
    };
    
    PromiseObject.prototype = {
        resolve: function(){
            var res, cont_chain = true, resarr = [], local_promises = [], i, me = this;
            
            this.fireComplete();
            
            for(i = 0; i < this.c.length; i++){
                if(self.is(this.c[i], 'function')){
                    try {
                        res = this.c[i].apply(this, arguments);
                    }catch(e){
                        if(e instanceof exceptionChainBreak){
                            if(this.e.terminate){
                                return;
                            }else{
                                cont_chain = false;
                                continue;
                            }
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

            this.fireAnyway();
            if(cont_chain && local_promises.length > 0){
                Promise.join(local_promises).done(function(){
                    if(me.promise) me.promise.resolve.apply(me.promise, arguments);
                }).fail(function(errdata){
                    if(me.promise) me.promise.error(errdata);
                });
            }else{
                if (cont_chain && this.promise) {
                    this.promise.resolve.apply(this.promise, resarr);
                }
            }

        },
        stop: function(data, terminate){
            exception(exceptionChainBreak, data, terminate);
        },
        error: function(){
            var i;
            this.fireComplete();
            
            var cont_chain = true, res;
            for(i = 0; i < this.e.length; i++){
                if(self.is(this.e[i], 'function')){
                    res = this.e[i].apply(this, arguments);
                    if(res === false){
                        cont_chain = false;
                    }
                }
            }

            this.fireAnyway();

            if (this.promise && cont_chain) {
                
                this.promise.error.apply(this.promise, arguments);
            }
        },
        then: function(cf, ef){
            this.promise = self.Promise();

            function addTo(dest, cbarr){
                if(self.isArray(cbarr))
                    for(var i = 0; i < cbarr.length; i ++)
                        dest.push(cbarr[i]);
                else
                    dest.push(cbarr);
            }

            addTo(this.c, cf);
            addTo(this.e, ef);
            return this.promise;
        },
        done: function(){
            for(var i = 0; i < arguments.length; i++){
                this.c.push(arguments[i]);
            }
            return this;
        },
        doneThen: function(){
            return this.done.apply(this, arguments).then();
        },
        fail: function(){
            for(var i = 0; i < arguments.length; i++){
                this.e.push(arguments[i]);
            }
            return this;
        },
        failThen: function(){
            return this.fail.apply(this, arguments).then();
        },
        anyway: function(cb){
            if(self.is(cb, 'function'))
                this.anyway_cb = cb;
            return this;
        },
        anywayThen: function(){
            return this.anyway.apply(this, arguments).then();
        },
        complete: function(cb){
            if(self.is(cb, 'function'))
                this.complete_cb = cb;
            return this;
        },
        getDoneFunctions: function(){
            return this.c;
        },
        getErrorFunctions: function(){
            return this.e;
        },
        getId: function(){
            return this.id;
        },
        setId: function(id){
            this.id = id;
            return this;
        },
        fireAnyway: function (){
            if(this.anyway_cb){
                this.anyway_cb();
                return true;
            }
            return false;
        },
        fireComplete: function (){
            if(this.complete_cb){
                this.complete_cb();
                return true;
            }
            return false;
        }
    };
    
    
    function Promise(id){
        return new PromiseObject();
    };
    
    Promise.isPromise = function(promise){
        if(promise && promise instanceof PromiseObject){
            return true;
        }
        return false;
    };
    
    
    
    Promise.join = function(promises, success_on_one){
        var i, errarr = [], resarr = [], count = promises.length, 
            success_count = 0, fail_count = 0, joinedp = Promise();
        
        
        for (i = 0; i < promises.length; i++){
            if (Promise.isPromise(promises[i])){
                promises[i].then(function(){
                    success_count++;
                    var res_data = [];
                    resarr.push(res_data);
                    DEBUG.log('args = ', arguments);
                    for(i = 0; i < arguments.length; i ++){
                        res_data.push(arguments[i])
                    }
                }, function(){
                    var error = [];
                    fail_count++;
                    errarr.push({promise: this, error: error});
                    
                    for(i = 0; i < arguments.length; i ++){
                        error.push(arguments[i]);
                    }
                }).anyway(function(){
                    if(--count === 0 && 
                       (
                            success_count === promises.length || 
                            (success_on_one && success_count > 0)
                       )
                    ){
                        DEBUG.log('resarr = ', resarr);
                        if(promises.length === 1)
                            joinedp.resolve.apply(joinedp, resarr[0]);
                        else
                            joinedp.resolve(success_count, fail_count);
                    }else if(count === 0){
                        joinedp.error(errarr);
                    }
                });
            }
        }
        
        return joinedp;
    };
    
    this.Promise = Promise;
    
    
};

var Promises = new function(){
    this.postData = function(data, options){
        var settings = {
            datatype: 'text',
            url: '/'
        }, p =  new FL.Promise();
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