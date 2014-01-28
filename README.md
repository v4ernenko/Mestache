# Mestache

Yet another implementation of the Mustache template language in JavaScript.

## Usage

```js
var result,

    context = {
        name: 'Vadim'
    },

    template = 'Hello, {{name}}!',

    mestache = new Mestache(template);

result = mestache.compileTemplate(context);
```

## License

MIT
