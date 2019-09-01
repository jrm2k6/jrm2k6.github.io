---
layout: post
title: Webpack tips and tricks
---

### Introduction

I am nowhere close to be a webpack master. Webpack has been more often than not a pain in the butt. As I work more and more with it, I have used a few things that makes Webpack a really useful tool, not only for easy bundling but also for code quality and ease of development.

Note: I will try to update this list as I discover more things. This is more a dump of features and configurations than a real blog post.

### Nice aliases for your imports

Nothing worse that seeing some imports being like this:
{% highlight javascript %}
import MyBeautifulComponent from "../../../../components/MyBeautifulComponent";
{% endhighlight %}

A few workarounds here:
- don't nest your folders that much
- webpack aliases

To be able to use something like:
{% highlight javascript %}
import MyBeautifulComponent from "components/MyBeautifulComponents"
{% endhighlight %}
wherever you are located in your project, just add the following to your webpack config:

{% highlight javascript %}
resolve: {
        alias: {
            components: path.resolve(__dirname, 'src/components'),
        }
    },
{% endhighlight %}

Reference: [resolvealias](https://webpack.js.org/configuration/resolve/#resolvealias)


## Dynamic imports
Through the use of the webpack magic comment + dynamic imports, you can import modules on the fly. This can help make your bundle smaller if you know that a big chunk of code is only needed under some specific conditions. There are neverthless a few things to set up to have it working correctly.

Make sure you have the [dynamic-import](https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import/) babel plugin installed:
`npm install --save-dev @babel/plugin-syntax-dynamic-import` and enable the usage of it in your .babelrc or equivalent. If you are using [Babel 7.5.0](https://babeljs.io/blog/2019/07/03/7.5.0) and newer, it already includes it.

Let's say we have a big chunk of code that we don't necessarily need imported. Let's put the entry point of that file in a file name bigChunk.js.

For the sake of an example:
{% highlight javascript %}
export default function getBigContent() {
    /*
        Imagine a bunch of imports at the top, and a lot of function calls in here
    */
    return [];
}
{% endhighlight %}

If you want to load it if an `if` condition is triggered, in app.js:

{% highlight javascript %}
if (shouldLoadBigChunk) {
    const getBigContentBundle = await import("bigChunk");
    const getBigContentFunction = getBigContentBundle.default;
}
{% endhighlight %}
This is assuming that `app.js` and `bigChunk.js` are actually in the same folder in your application.
What happens when bundling is that Webpack will create a new bundle only for bigChunk.js. When it is imported, a network request will be done to fetch the bundle and execute it.
`import` returns a promise so make sure to use async/await for ease of use.

//TODO: add default/non-default example.

If we have the configuration above, Webpack will generate a bundle with a random hash, which can make debugging a bit harder when you want to verify that it is actually loaded. To make things easier, you can use the magic comment Webpack provides.

If you update `const getBigContentBundle = await import("bigChunk");` to
{% highlight javascript %}
const getBigContentBundle = await import(/* webpackChunkName: "bigChunk" */ "bigChunk");
{% endhighlight %}
Webpack will now generate a bundle named `bigChunk.js` istead of a random name.

### Gotchas
I had a case where I was trying to request a bundle dynamically based on a file located a level above, something like:
`const getBigContentBundle = await import("../bigChunk");`. I wanted it to work in development mode (with hot-loading) as well as in production mode, without having to do a lot of changes.
What I settled on was to use resolved aliases + `__webpack_public_path__`.

I also attempted to use the `publicPath` property in my webpack config, specifying where the assets should be referenced from in my dynamic imports, without success.

The difference between `publicPath` and `__webpack_public_path__` is that the latter lets you define where you should load your bundles from, on the fly. They do serve the same purpose though. One is at build time while the other is at run time.
For more information: [Webpack public path](https://webpack.js.org/guides/public-path/)

To solve my issue, I did:
- set `__webpack_public_path__` in my entrypoint script (app.js).
- specify an alias to use for my dynamically imported bundle, something like:
{% highlight javascript %}
resolve: {
    alias: {
        bigChunk$: path.resolve(__dirname, "..", "client", "bigChunks.js")
    }
},
{% endhighlight %}

This means that I could simple refer to `await import(/* webpackChunkName: "bigChunk" */ "bigChunk");` even if bigChunk.js isn't a sibling of the file importing it.

You can notice the $ sign in the alias configuration after the bundle name. It is to make sure we have an exact match for the module name, meaning it refers to a file and not a folder.

## Webpack dev server
Nowadays, I work with a Nodejs/Express backend and React frontends, in separate repos. 
[webpack dev server](https://webpack.js.org/configuration/dev-server/) lets you specify where to proxy the requests that are not for your static assets or your hot-reloaded frontend bundle to go to your backend.
This is an example of a configuration:

{% highlight javascript %}
devServer: {
        https: true,
        publicPath: "/static/",
        port: 9999,
        hot: true,
        proxy: {
            '/': {
                secure: false, // self-signed certificate
                changeOrigin: true,
                target: 'https://localhost:3002',
                historyApiFallback: true,
                bypass: function (req) {
                    if (req.url.indexOf('/static/') > -1 || req.url.indexOf('hot-update') > -1) {
                        return req.url;
                    }
                }
            }
        }
    }
{% endhighlight %}

### Conclusion

That's a wrap.