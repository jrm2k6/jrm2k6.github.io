---
layout: post
title: Are my programming pet peeves justified?
---

## Note
I will keep this list of pet peeves updated as time goes by.

### Map followed by filter or filter followed by map
Example:

```
[1,8,2,6,7,14].map(x => x * 5).filter(x => x > 30) or
[1,8,2,6,7,14].map(x => x * 5).filter(x => x > 30)
```

vs 

```
[1,8,2,6,7,14].reduce((acc, x) => { 
    if (x * 5 > 30) acc.push(x * 5)
    return acc;
}, [])
```

The reduce iterates over the original array of length N only once and will return an array of at most N elements.
In the first case, we will iterate once over the original array once and then iterate again over the array return by the `map` operation.

#### But it feels more readable!

If you are comfortable with the for loop equivalent of the reduce, it feels like a cheap excuse.

The difference between the `reduce` callback and the for loop implementation is minimal.

```
let results = [];
[1,8,2,6,7,14].forEach(x => { 
    if (x * 5 > 30) results.push(x * 5)
}, [])
```

The only difference is making sure you are returning the accumulator from the callback in the `reduce` solution.
The advantage of using `reduce` is that it is pure, compared to the forEach/for loop equivalent.


### Ternary or if / else return true : false;
Example:
```
return i > 4 ? true : false

vs

return i > 4;
```

This one usually is a result of not paying attention. Not a big deal on its own, but I am pretty sure IDEs would be telling you the code could be simplified so it should *never*[^1] be seeng in a PR submitted for code reviews.


[^1]: This is sarcastic. Accidents happen, but if it happens multiple times, it probably means you need to go through your changes before committing/pushing as it should be easy to spot on.

### Commenting code for the sake of commenting
Example:
```
# open connection to DB
db.openConnection();

```

I know how to read, thank you.


### Pure functions not being unit-tested
I believe in unit testing, and testing in general. But I also understand (not necessarily believe) in having to produce features fast. I also believe in not unit testing everything for code flexibility. 
With that being said, I often see functions with a few edge cases, a fairly simple method signature, with fairly simple parameters, not being unit tested.
Why not? The function is pure, it is fast for you to just create a new file,write the scenarios you need this method to run for, and feed it values, and see what happens.
The consequences of that type of approach are only positive.

1. Easy to figure out what the function does for reviewers/you in 6 months.
    - you see the input, you see the output. Easy to point out issues when reviewing by pretty much giving an input for which you don't think it would work.
2. Easy to maintain
    - you discovered a bug with it or an edge case you didn't think about originally. Great! Add new code for the edge case, re-run your test to verify it behaves as expected. It gives you a sense of confidence that at least you didn't introduce a regression.
3. Gives you confidence in writing tests
    - Writing good tests is not easy. It takes a lot of attempts/failures to get to a point where you think your tests makes sense, are not overkill, are useful, are not getting in your way when modifying your code. Starting with the "easy" piece of code is the best way to get into the testing mindset.


### Not being able to run code locally to verify changes
It happens sometimes, and this makes me angry. You need me to fix this bug but there is no way for me to test it locally before pushing my changes?

Do I usually drive blindfolded?

*We don't have the data to reproduce the bug*

Then, you don't have a bug that I can fix. My first step here would be to add logging before I even attempt to do anything else.

*It relies on another service returning that data*

Then, run the other service locally too. We have so many tools nowadays to let you run multiple services locally easily.
For services, docker.
You use AWS: localstack.

*But now that service relies on another service*

Same answer as above, docker and docker-compose.

*It is too many services, I just want to fix that bug*

Either you were not prepared for a microservice oriented architecture, or you went crazy with it for no reason.
In the worst case you cannot do full end to end, you need to mock the data returned by downstream services. This is non-negotiable.

[^1]: This is sarcastic. Accidents happen, but if it happens multiple times, it probably means you need to go through your changes before committing/pushing as it should be easy to spot on.