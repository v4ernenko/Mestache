/**
 * @overview Yet another implementation of the Mustache template language in JavaScript.
 * @license MIT
 * @version 0.2.2
 * @author Vadim Chernenko
 * @see {@link http://mustache.github.io/mustache.5.html|Mustache reference}
 * @see {@link https://github.com/v4ernenko/Mestache|Mestache source code repository}
 */

var Mestache = (function () {
    'use strict';

    // Internal helper methods

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

                    .replace(/'/g, '&#39;');
            }
        };

    // Template tags description

    var oTag = '{{',

        cTagRE = /\}\}\}?/g;

    /**
     * Breaks up the given `template` string into a tree of tokens.
     *
     * @param {string} template
     * @return {Array.<Object>} Array of tokens.
     * @private
     */

    function parseTemplate(template) {
        var type,

            name,

            stack = [],

            tokens = [],

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

                return;
            }

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
        });

        return tokens;
    }

    /**
     * Returns the value of the given `name` in the given `context`.
     *
     * @param {string} name
     * @param {Object} context
     * @return {*} Context value.
     * @private
     */

    function getContextValue(name, context) {
        var value;

        if (name.indexOf('.') > 0) {
            value = context;

            var i = 0,

                names = name.split('.'),

                namesLength = names.length;

            while (value && i < namesLength) {
                value = value[names[i++]];
            }
        } else {
            value = context[name];
        }

        if (util.isFunction(value)) {
            value = value.call(context);
        }

        return value;
    }

    /**
     * Renders the given array of `tokens` using the given `context` and `partials`.
     *
     * @param {Array.<Object>} tokens
     * @param {Object} context
     * @param {Object} [partials]
     * @return {string} Compiled template.
     * @private
     */

    function renderTokens(tokens, context, partials) {
        var result = [];

        context = Object(context);

        util.forEach(tokens, function (token) {
            switch (token.type) {
                case '^':
                    var value = getContextValue(token.name, context);

                    if (util.isEmpty(value)) {
                        result.push(renderTokens(token.value, context, partials));
                    }

                    break;

                case '#':
                    var value = getContextValue(token.name, context);

                    if (util.isEmpty(value)) {
                        return;
                    }

                    if (util.isArray(value)) {
                        util.forEach(value, function (item) {
                            var itemContext = util.isObject(item) ? item : {'.': item};

                            result.push(renderTokens(token.value, itemContext, partials));
                        });
                    } else if (util.isObject(value)) {
                        result.push(renderTokens(token.value, value, partials));
                    } else {
                        result.push(renderTokens(token.value, context, partials));
                    }

                    break;

                case '>':
                    if (!util.isObject(partials)) {
                        return;
                    }

                    var value = getContextValue(token.name, partials);

                    if (!value || !util.isString(value)) {
                        return;
                    }

                    result.push(renderTokens(parseTemplate(value), context, partials));

                    break;

                case '&':
                case 'name':
                    var value = getContextValue(token.name, context);

                    if (util.isEmpty(value)) {
                        return;
                    }

                    value = String(value);

                    result.push(token.type === '&' ? value : util.escapeHTML(value));

                    break;

                case 'text':
                    result.push(token.value);

                    break;
            }
        });

        return result.join('');
    }

    /**
     * Mestache class.
     *
     * @param {string} template
     * @constructor
     */

    function Mestache(template) {
        if (!template || !util.isString(template)) {
            throw new Error('Mestache: bad template!');
        }

        this._tokens = parseTemplate(template);
    }

    /**
     * Compiles the template with the given `context` and `partials`.
     *
     * @param {Object} context
     * @param {Object} [partials]
     * @return {string} Compiled template.
     */

    Mestache.prototype.compileTemplate = function (context, partials) {
        return renderTokens(this._tokens, context, partials);
    };

    return Mestache;
})();
