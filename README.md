FlyLib
======

FlyLib is a JavaScript library that enables you to use promises in your applolications. You can read more about promises [here](http://www.html5rocks.com/en/tutorials/es6/promises/).


How do you use it?
======


THe example below will show you how to use this library to manipulate with promises.

```js

Promises.postData({ name: "John", location: "Boston" }, {datatype: 'json', url: 'admin.json'})
.then(function(data) {
    $('#answer').html(JSON.stringify(data));
}, function(err) {
    $('#answer').html('Error happened while doing the request to server: ' + err);
})

```

Promises.postData function will use jQuery function `$.ajax` to make a custom request to server. When the answer from the server received the first function in the argument list of `then` function will be called if the request completed successfully, and the second function will be called otherwise.

You can compare this code to the traditional way of doing the request with jQuery:

```js

$.ajax({
  type: "POST",
  datatype: 'json',
  url: "admin.json",
  data: { name: "John", location: "Boston" },
  success: function(data){
    $('#answer').html(JSON.stringify(data));
  },
  error: function(err){
    $('#answer').html('Error happened while doing the request to server: ' + err);
  }
})


```

What you can do more is to return the promise itself as the result of the success function. And here what will happen in this case...

`Then` function always returns promise and this promise will be resolved only when the internal promise 
succeeds or fails. So there won't be many callbacks and you will receive  the code that you can easily debug and read.

You can see how to do it in the `test/index.html` file. It uses jQuery-UI library to show modalbox to the user  and the user decides what to do next.


So the code for it will look like this:

```js


Promises.postData(...)
  .then(function(data) { 
  	return yesno(); 
  }, ...)
  .done(function(decision){
  	if(decision === true){
  		//do something when the clicks 'Yes' button
  	}else{
  		//do something when the clicks 'No' button
  	}
  });

```


Examples
========

More examples will be ready soon...



