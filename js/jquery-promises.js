$.extend(Promises, {
    jYesNo: function(title, message) {
        var promise = FL.Promise();
        var dialog = $('<div>').attr('title', title).append('<p>')
                .children('p').text(message).end()
                .appendTo('body')
        .dialog({
            resizable: false,
            height: 140,
            modal: true,
            buttons: {
                Yes: function() {
                    dialog.dialog("close").remove();
                    promise.resolve(true);
                },
                No: function() {
                    dialog.dialog("close").remove();
                    promise.resolve(false);
                }
            }
        });
        return promise;
    }
});