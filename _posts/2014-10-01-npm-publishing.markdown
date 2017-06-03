---
layout: post
title: NPM
---
Great, you have some cool code that you use for your project, and you wish everybody could see how cool you are, and how clean your code is. Lucky guy, your code can totally be extracted to a small module in javascript, perfect occasion to publish your first npm module. Your code is ready, time to package, publish and enjoy.

###Creating your user

Assuming you have npm installed of course, run `npm adduser`.

You will have to enter a username, name and email address. You can also sign up directly on the website.

###Creating your package
After having extracted the code that you want to have in your module, go into your repository and run `npm init`.
It will output some fields to complete to generate a default `package.json`.


I wont be too long on the content of your `package.json` but just know that it is what identify your module, what are its dependencies, its entry point and what it contains. It can contain a lot of other informations that you can discover [here](https://docs.npmjs.com/files/package.json)


Let's go quickly through the most important information that your package.json should contain:

 - main is the entry point of your module. Basically the `module.exports` part of the file specified as your main value will be the methods available for your module. In other words, `require('your-module')` will just return the exports part of your main property of your `package.json`

 - files is an array of the files you want to include in your package. It can be any file: templates, css files, plain text.
 - version is your module version. Don't forget to bump it each time you publish, otherwise you are going to get an error.


###Testing your package locally

 Before publishing you should make sure that your package works correctly.
 To do so, just `run npm pack`.
 It will create an archive.
 Then, create a new project somewhere on your machine:

    mkdir my-new-project && cd
    npm init //enter enter enter...enter
    npm install --save ../path_to_your_module_folder/module_archive.tgz


 You can then check the content of your `node_modules` and verify that all the files needed are there.
 You can run node and require your module, and verify that everything is ok.

###Publishing

    cd my-module-folder
    npm publish


Verify on the website, and you can even `npm install your-module` in the test project that you had.


###Bumping version number using npm
`npm version patch`


###Deploying to npm from TravisCI
Create a `.travis.yml` in your folder and make sure it contains the following:




    language: node_js
    node_js:
      - 0.10
    deploy:
    provider: npm
    api_key:
       secure: 'YOUR_KEY'
    on:
       tags: true


This will deploy your module to the npm registry if the build is successful.
You need to specify your Travis API key, but make sure it is encrypted.

To do so:
Install the Travis CLI if you don't have it (assuming you have at least ruby version 1.9.3)


    gem install travis -v 1.7.4 --no-rdoc --no-ri
    cat  ~/.npmrc (copy the _auth property in your clipboard)

    travis encrypt --add deploy.api_key
    (paste the _auth property)
    (CTRL+D)

Copy paste the key into your .travis.yml.

Simpler: go into your module folder where you have create your `.travis.yml`
Run `travis setup npm`

Assuming you use Github to version source control your module, and you have the webhook set up, it should work.

If you need more information, you can check my npm module: [dynamic-json-resume](https://github.com/jrm2k6/dynamic-json-resume)

###Resources
- [NPM website](https://www.npmjs.com)
- [NPM deployment using Travis CI](http://docs.travis-ci.com/user/deployment/npm/)
- [Digital Ocean Article](https://www.digitalocean.com/community/tutorials/how-to-use-npm-to-build-and-publish-node-js-packages-on-a-linux-server)
