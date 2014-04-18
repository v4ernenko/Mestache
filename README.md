# Mestache

Yet another implementation of the Mustache template language in JavaScript.

## Usage

```js
var result,

    result2,

    context = {
        name: 'Vadim'
    },

    partials = {}, // optional

    template = 'Hello, {{name}}!',

    mestache = new Mestache(template),

    customTemplate = 'Hello, <<! name !>>!',

    customMestache = new Mestache(customTemplate, {tags: ['<<!', '!>>']});

result = mestache.compileTemplate(context, partials);
result2 = customMestache.compileTemplate(context, partials);
```

## Divergence

- ~~Only `mustache` tags are supported~~.
- Section lambdas not retrieving content.

## License

MIT
