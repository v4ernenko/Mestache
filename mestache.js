/*
    Mestache 0.2.0

    Yet another implementation of the Mustache template language in JavaScript

    Released under the MIT License (http://www.opensource.org/licenses/mit-license.php)

    Usage:

    var result,

        context = {
            name: 'Vadim'
        },

        template = 'Hello, {{name}}!',

        mestache = new Mestache(template);

    result = mestache.compileTemplate(context);
*/

var Mestache = (function () {
    'use strict';

    var util = {
            trim: String.trim || function (value) {
                return String(value).replace(/^\s+|\s+$/g, '');
            },

            isArray: Array.isArray || function (value) {
                return {}.toString.call(value) === '[object Array]';
            },

            isEmpty: function (value) {
                if (!value) {
                    return true;
                }

                if (this.isArray(value)) {
                    return value.length === 0;
                } else if (this.isObject(value)) {
                    if (Object.getOwnPropertyNames) {
                        return Object.getOwnPropertyNames(value).length === 0;
                    }

                    for (var key in value) {
                        if (value.hasOwnProperty(key)) {
                            return false;
                        }
                    }

                    return true;
                }

                return false;
            },

            forEach: function (list, callback, context) {
                for (var i = 0, n = list.length; i < n; i++) {
                    if (callback.call(context, list[i], i, list) === false) {
                        break;
                    }
                }
            },

            isString: function (value) {
                return typeof value === 'string';
            },

            isObject: function (value) {
                return !!value && typeof value === 'object';
            },

            isFunction: function (value) {
                return typeof value === 'function';
            },

            escapeHTML: function (value) {
                return String(value)
                    .replace(/&/g, '&amp;')

                    .replace(/</g, '&lt;')

                    .replace(/>/g, '&gt;')

                    .replace(/"/g, '&quot;')

                    .replace(/'/g, '&apos;');
            }
        },

        oTag = '{{',

        cTagRE = /\}\}\}?/g;

    var parseTemplate = function (template) {
        var type,

            name,

            stack = [],

            tokens = [],

            //chunks = template.split(/\{\{|\}\}\}?/);

            chunks = template.replace(cTagRE, oTag).split(oTag);

        util.forEach(chunks, function (chunk, index) {
            if (!chunk) {
                return;
            }

            if (index % 2 === 0) {
                tokens.push({
                    type: 'text',
                    value: chunk
                });
            } else {
                type = chunk.charAt(0);

                name = util.trim(chunk.slice(1));

                switch (type) {
                    case '!': break;

                    case '#':
                    case '^':
                        var sectionTokens = [];

                        tokens.push({
                            type: type,
                            name: name,
                            value: sectionTokens
                        });

                        stack.push({
                            name: name,
                            root: tokens
                        });

                        tokens = sectionTokens;

                        break;

                    case '>':
                        tokens.push({
                            type: type,
                            name: name
                        });

                        break;

                    case '&':
                    case '{':
                        tokens.push({
                            type: '&',
                            name: name
                        });

                        break;
                        
                    case '/':
                        var stackItem = stack.pop();

                        if (!stackItem) {
                            throw new Error('Mestache: unopened section "' + name + '"!');
                        }

                        if (name === stackItem.name) {
                            tokens = stackItem.root;
                        } else {
                            throw new Error('Mestache: unclosed section "' + stackItem.name + '"!');
                        }

                        break;

                    default:
                        tokens.push({
                            type: 'name',
                            name: util.trim(chunk)
                        });
                }
            }
        });

        return tokens;
    };

    var lookupData = function (name, context) {
        var data = context[name];

        if (name.indexOf('.') > 0) {
            data = context;

            var i = 0,

                names = name.split('.');

            while (data && i < names.length) {
                data = data[names[i++]];
            }
        }

        if (util.isFunction(data)) {
            data = data.call(context);
        }

        return data;
    };

    var renderTokens = function (tokens, context, partials) {
        var result = [];

        context = Object(context);

        util.forEach(tokens, function (token) {
            switch (token.type) {
                case '^':
                    var data = lookupData(token.name, context);

                    if (util.isEmpty(data)) {
                        result.push(renderTokens(token.value, context, partials));
                    }

                    break;

                case '#':
                    var data = lookupData(token.name, context);

                    if (util.isEmpty(data)) {
                        return;
                    }

                    if (util.isArray(data)) {
                        util.forEach(data, function (item) {
                            var itemContext = util.isObject(item) ? item : {'.': item};

                            result.push(renderTokens(token.value, itemContext, partials));
                        });
                    } else if (util.isObject(data)) {
                        result.push(renderTokens(token.value, data, partials));
                    } else {
                        result.push(renderTokens(token.value, context, partials));
                    }

                    break;

                case '>':
                    if (!util.isObject(partials)) {
                        return;
                    }

                    var data = lookupData(token.name, partials);

                    //data = String(data);

                    if (!data || !util.isString(data)) {
                        return;
                    }

                    result.push(renderTokens(parseTemplate(data), context, partials));

                    break;

                case '&':
                case 'name':
                    var data = lookupData(token.name, context);

                    if (util.isEmpty(data)) {
                        return;
                    }

                    data = String(data);

                    result.push(token.type === '&' ? data : util.escapeHTML(data));

                    break;

                case 'text':
                    result.push(token.value);

                    break;
            }
        });

        return result.join('');
    };

    var MestacheConstructor = function (template) {
        if (!template || !util.isString(template)) {
            throw new Error('Mestache: bad template!');
        }

        this._tokens = parseTemplate(template);
    };

    MestacheConstructor.prototype.compileTemplate = function (context, partials) {
        return renderTokens(this._tokens, context, partials);
    };

    return MestacheConstructor;
})();
