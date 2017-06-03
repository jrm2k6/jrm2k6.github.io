---
layout: post
title: JSDays
---

I had the pleasure to go to Verona to attend the jsDay. First time in Italy, first time in a Javascript conference.

Quick introduction of the conference:

 - 250/300 people
 - In some big hotel in Verona
 - A lot of locals, not a lot of English speakers around, but all the talks were in English.
 - 50/50 between international and Italian speakers.
 - The wifi was terrible.
 - They were mentioning the level of the talk (beginner, intermediate, advanced). I think it is pretty cool to have that because you can have an idea of what to expect.


Here is some details about some of the talks I've attended.
Be careful, everything is based on sh**** notes, on some random sheet of paper, with a random licking pen, so not necessarly extra-accurate.

####Javascript, metaprogramming and you - Massimiliano Mantione - [Slides](http://massimiliano-mantione.github.io/talks/JsDay2014/MetascriptKeynote/GHP/#/)####

A nice talk about meta-programming and how it can help you empower your code. He gave an introduction about Metascript, a meta-programming language he has been working on.
He talked about different alternatives to use instead of Javascript, like Coffeescript, Typescript, Lispscript and ClojureScript, and how Metascript was trying to take the best from all those alternatives.
He said that Typescript did a good job, with the exception of checking for nullable types.
He liked LispScript and Clojurescript but thinks that the syntax is an issue to their adoption.

He mentioned several times how Haskell has also an influence for him, and his implementation choice.
At the end, he showed another example which was creating a UI (small progress bar), mixing Metascript and React.js.
It seemed to be really clean. Worth checking if it gets bigger, as it seems to have a really small community for now.

The tone was set with this technical keynote, maybe too technical for a keynote :)


####NSA.js - Danni Friedland - [Slides](http://www.slideshare.net/DanniFriedland/nsajs)####

He described his javascript library for user behavior tracking. It is not production ready but he planned to release it within a month.
It is using [MutationObservers](https://developer.mozilla.org/en/docs/Web/API/MutationObserver) to record all the DOM changes on a page, while the user interacts with the page (scrolling, clicking and so on). You can then record all the interactions and replay them.
The known limitations are that external CSS and assets are not handled correctly, but it is getting there. He had a video which was showing how it worked. This talk was inspiring and it could be cool to think about how it can be used for automatic testing. I also like how available the speaker was (even if my questions were asked on twitter). I will definitely check it when it is going to be release, as I have some unclear ideas of how it could be used.


####NoFlo.js - Henri Bergius - [Website](http://noflojs.org/)####

The speaker gave a short introduction about flow-base programming, which has its origin in the 70's. He explained how each component of an application is independent, and acts as a black box for the rest of the system. It is just passing messages/streams around. With Noflo, your application is just a set of boxes, that you connect to create a graph. The UI was pretty nice, with a zoomable interface ala Prezi, showing you more details about the different components of your system.
The talk was a bit too short to really understand how it was working. Nice to see a Kickstarter campaign ending in a real product.


####The spirit of testing. - Marco Cedaro - [Slides](https://speakerdeck.com/cedmax/the-spirit-of-testing-jsday)####

Related to the importance of testing, and how it could be complex to do it in Javascript because we give too much importance to the framework.
Marco, engineer at Shazam, also talked about how testing should be a selfish act, as it is to prove that your code is good, and that we are always testing things already working, just because we like to feel secure. It is an ego process.The last part was related to CI and when to automate things. The answer was, automate things when it is a priority. I liked the questions he mentioned when talking about CI with people. How long it takes to build/release? What is your code coverage? And so on.
The talk was more inspirational than technical, but entertaining.


####Frameworkless JavaScript with npm and browserify - Rob Ashton####

Even if npm is targeting server side javascript code, it is possible to use it for the front-end as well.
The pace of this talk was really fast, but I liked it. I particuliarly liked the pattern described to structured your code.
Structure it by features, not by type of files. It makes everything easier. Your scope is more defined when you work on a feature. You are having your micro-environment in your small package.




####The strange world of Javascript and all its little asynchronous beasts - Federico Galassi  - [Slides](http://www.slideshare.net/fgalassi/the-strange-world-of-javascript-and-all-its-little-asynchronous-beasts)####

The talk, as the title said, was all about asynchronity in Javascript. The keypoint was that in modern applications, you need to be able to block, and Javascript cannot do that. He started by giving an example of the pyramid of doom, or callback hell in Javascript. Then, Frederico explained how ES6 will be able to help, using generators. Generators are helping in not losing the control and error flow, which is the main problem nowadays. He talked shortly about async.js, saying it was too complex, but gave an example of functional composition using it. The last part of the talk was about promises, and reactive programming. Rx.js was somehow superior to promises, because of the limited vision of promises, as you need to recreate promises over time, but streams are push based, meaning you just observe once, and let updates come to you. Extra point for the drag'n'drop code using rx.js. :)

The talk was technical, the demos were working well, the speaker explained really well some concepts, with relevant examples.


####Automated CSS-testing with JavaScript; Not just a myth - Jakob Mattson - [Slides](https://speakerdeck.com/jakobmattsson/automated-css-testing-not-just-a-myth)####

Extra-point for this speaker also as he was wearing a bow-tie.
Jakob tried to raise awareness and inspire about finding a solution for automatizing CSS testing. He said that CSS was nice, but we were usually adding CSS, never removing it because we don't know what it could break. There is no overview on how the different styles in your application interact.
He talked about code quality and TDD, and applied it to CSS and design. TDD relies on having a failing test, implementing, checking that the test passes and refactor. For implementation of a design, it should be getting a design, implementing it, having it right and iterate, but for this you need to be able to test correctly the visual appearance of your implementation. He mentioned four approaches, that we can resume as:

 - checking validity of CSS ([csslint](http://csslint.net/))
 - styleguide and code review
 - screenshots ([Huxley](https://github.com/facebook/huxley))
 - comparing style in the dom ([Hardy](http://hardy.io/))

The solution would be a mix of those 4 points. Nobody did it yet. So my conclusion is: it is still a myth.




###My takeaways###

- Reactive programming is trendy. It resolves some important issues also. Rx.js is mentioned everywhere, and seems to solve
long term issues in a nice and effective way.
- I was surprised by the nsa.js talk. I think it was really nice and impressive. I can see some real possibities of using this for automatic
acceptance tests.
- I missed some talks about managing big codebase. Nobody talked about that, except maybe the browserify + npm talk where he mentioned a way of managing your codebase by features.


This was my mediocre attempt to summarize my second ever attend conferences (after the PyCon in 2013). Another article is doing it in a much better way than mine: [Anynines javascript days wrap-up](http://blog.anynines.com/javascript-days/).
