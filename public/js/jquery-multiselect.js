/*
 * Jquery Multiselect插件 中文叫列表多选插件
 * Example:
 * $('table').multiSelect({
 *  actcls: 'active',
 *  selector: 'tbody tr',
 *  callback: false
 * });
 */
(function ($) {
    $.fn.multiSelect = function (options) {
        $.fn.multiSelect.init($(this), options);
    };

    $.extend($.fn.multiSelect, {
        defaults: {
            actcls: 'active', //Selected style
            selector: 'tbody tr', //Row selected elements
            except: ['tbody'], //Not after removing the effect of multiple-choice element selected queue
            statics: ['.static'], //Exculude rows
            callback: false //Callback after clicks [fn(items, clickEvent)]
        },
        first: null, //When you press shift, to remember the first click of the item
        last: null, //Last click on an item
        init: function (scope, options) {
            this.scope = scope;
            this.options = $.extend({}, this.defaults, options);
            this.initEvent();
        },
        checkStatics: function (dom) {
            for (var i in this.options.statics) {
                if (dom.is(this.options.statics[i])) {
                    return true;
                }
            }
        },
        initEvent: function () {
            var self = this,
                scope = self.scope,
                options = self.options,
                callback = options.callback,
                actcls = options.actcls;

            scope.on('click.mSelect', options.selector, function (e) {
                if (!e.shiftKey && self.checkStatics($(this))) {
                    return;
                }

                if ($(this).hasClass(actcls)) {
                    $(this).removeClass(actcls);
                } else {
                    $(this).addClass(actcls);
                }

                if (e.shiftKey && self.last) {
                    if (!self.first) {
                        self.first = self.last;
                    }
                    var start = self.first.index();
                    var end = $(this).index();
                    if (start > end) {
                        var temp = start;
                        start = end;
                        end = temp;
                    }
                    $(options.selector, scope).removeClass(actcls).slice(start, end + 1).each(function () {
                        if (!self.checkStatics($(this))) {
                            $(this).addClass(actcls);
                        }
                    });
                    window.getSelection ? window.getSelection().removeAllRanges() : document.selection.empty();
                } else if (!e.ctrlKey && !e.metaKey) {
                    $(this).siblings().removeClass(actcls);
                }
                self.last = $(this);
                $.isFunction(callback) && callback($(options.selector + '.' + actcls, scope), e);
            });

            /**
             * click to remove the selected elsewhere not part of the table
             */
            $(document).on('click.mSelect', function (e) {
                for (var i in options.except) {
                    var except = options.except[i];
                    if ($(e.target).is(except) || $(e.target).parents(except).size()) {
                        return;
                    }
                }
                scope.find(options.selector).each(function () {
                    if (!self.checkStatics($(this))) {
                        $(this).removeClass(actcls);
                    }
                });
                $.isFunction(callback) && callback($(options.selector + '.' + actcls, scope), e);
            });

            /**
             * Press and hold the clear shift state
             */
            $(document).on('keyup.mSelect', function (e) {
                if (e.keyCode == 16) {
                    self.first = null;
                }
            });
        }
    });
})(jQuery);
