# Mestache

Yet another implementation of the Mustache template language in JavaScript.

## Usage

```js
var result,

    context = {
        name: 'Vadim'
    },

    partials = {}, // optional

    template = 'Hello, {{name}}!',

    mestache = new Mestache(template);

result = mestache.compileTemplate(context, partials);
```

## Divergence

- Only `mustache` tags are supported.
- Section lambdas not retrieving content.

## License

MIT
