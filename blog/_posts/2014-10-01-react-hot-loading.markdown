---
layout: post
title: Hot Loading
---

# Introduction
Lately, I started to work on a project using React + Redux as a frontend and Laravel as my API backend.
The Laravel application is actually in charge of rendering the root view, where I include my bundled React application to mount to a specific div.

I got tired of always reloading my application on changes, especially as I am really good at doing typos, that's why I decided to give a try to react-hot-loader.
This article will describe how to setup webpack, its configuration and how to have react-hot-loader working within your Laravel application.


# Requirements
To begin with, let's install all of the npm packages needed.

```
npm install --save webpack webpack-dev-server react-hot-loader
```

I don't put here all the different packages installed but you can find the package.json I use for my project [here](https://gist.github.com/jrm2k6/ba72b7ad4306e13d072f#file-package-json).

# Webpack configuration

Now, let's create our webpack configuration. Create a file called webpack.config.js at the root of your project and paste the following in it.



    var webpack = require('webpack');

    var path = require('path');

    module.exports = {

    };



Let's then setup the context we need for webpack, meaning the folder in which it has to look to find the different files to bundle. In our case, it will only be JSX files. In the case of Laravel 5.1, those files should be located in ```resources/assets```.

We also add the entry points for our bundle. In this example, my React application is mounted from app.jsx. We add the webpack-dev-server and the hot reloading server before our main entry point.
Don't forget to add the client url after the webpack-dev-server entry.



    var webpack = require('webpack');
    var path = require('path');
    module.exports = {
	context: __dirname + '/resources/assets',

	entry: [
            'webpack-dev-server/client?http://localhost:3000',
            'webpack/hot/only-dev-server',
            './jsx/app.jsx',
        ],
    };



We will now add the ```output``` section of our config file:


    output: {
        path: __dirname + '/public/js',
        filename: "bundle.js",
        publicPath: 'http://localhost:3000/static/'
    },


This says that we want the generated javascript file to be called bundle.js and to be save in the ```public/js``` directory. Webpack-dev-server requires you to add a publicPath property to be pointing to the client url you just set up in your entry array.

Time to setup our different loaders.


    module: {

        loaders: [
            { test: /\.jsx?$/, loaders: ['react-hot', 'jsx?harmony'], include: __dirname + '/resources/assets'},

            { test: /\.jsx$/, exclude: /node_modules/, loaders: ['jsx-loader?insertPragma=React.DOM&harmony']},

            { test: /\.jsx$/, exclude: /node_modules/, loader: 'babel-loader'},
        ]
    },


The important part here is the react-hot loader included in the first loader. We tell it to apply the loader only for jsx files located in ```resources/assets```.
You can ignore the rest of the loader as I use jsx and babel to take advantage of the ES6 goodness.

The rest of the config file is pretty straightforward:


    resolve: {
        extensions: ['', '.js', '.jsx']
    },

    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin()
    ]



The hot module replacement plugin is needed to inject the updated modules into the active runtime. It is basically what is going to update your bundle magically.
NoErrorsPlugin is useful because it will pause when you have a syntax error.

You can find the full webpack configuration [here](https://gist.github.com/jrm2k6/ba72b7ad4306e13d072f#file-webpack-config-js).

# Create the webpack dev server.
The webpack dev server is basically a small express server. We just have to create it on listen to changes on ```localhost:3000/static```.


    var webpack = require('webpack');
    var WebpackDevServer = require('webpack-dev-server');
    var config = require('./webpack.config');

    new WebpackDevServer(webpack(config), {
    	publicPath: config.output.publicPath,
    	hot: true,
    	historyApiFallback: true
    }).listen(3000, 'localhost', function (err, result) {
    	if (err)
    		console.log(err);

    	console.log('Listening at localhost:3000');
    });


# Modifying your Laravel view.

Open the Blade view loading the js bundle containing your compiled React application. Instead of requiring the bundle.js of your public folder, require the bundle.js of the webpack dev server you are running.


    <!DOCTYPE html>
    <html>
        <head>
            @include('layout._styles')
        </head>
        <body>
            <div id="react-content"></div>
            <script src="http://localhost:3000/static/bundle.js"></script>
        </body>
    </html>



# Run and enjoy!

Now, start the node server: ```node server.js``` and load your Laravel app.
Modify the render function of one of your component and it should instantly display the updated version!

Remember, webpack-dev-server should only be used in development! Be careful not to forget to remove it before deploying!

# Next time
I now need to use the hot reloading for my reflux stores. This is an amazing talk to watch [Live React: Hot Reloading with Time Travel](https://www.youtube.com/watch?v=xsSnOQynTHs) and that's why I am really excited to have my React workflow improved thanks to people like Dan Abramov.

The pure nature of React and Reflux makes it really attractive to work with as not only your code is cleaner and more maintainable, but the development tools coming with it are incredible. Stay tuned for more articles!

# Resources
[Hot Reloading Configuration](https://gist.github.com/jrm2k6/ba72b7ad4306e13d072f)
