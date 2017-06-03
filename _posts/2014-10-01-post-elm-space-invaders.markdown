---
layout: post
title: ELM
---

In this post, I will explain how I build a small game  using Elm and FRP.
I won't go too much into details, for different reasons.
First one, I am a beginner using [FRP](http://elm-lang.org/learn/What-is-FRP.elm) and Elm, I don't understand all the concepts in details.
Secondly, what I wanted to achieve was to build a small game quickly, grasping the main concepts of Elm and having fun at the same time.



I am a developer, having worked almost exclusively with imperative languages in production.
I have an interest for functional programming. I took few Coursera classes about it (Functional principles in Scala and
Programming Languages, that I can only recommend). I have also been playing a bit with Haskell, but mainly doing small homework
[assignments](http://www.haskell.org/haskellwiki/H-99:_Ninety-Nine_Haskell_Problems).

Let's get started.

What I wanted to build was a small space invader game. You have a spaceship that you can rotate, and you can shoot enemies coming at you. If an enemy cross the imaginary line where you stand, you lose.

Having that said, we have now an idea of how we should build our game.
We can divide the implementation into three parts: the model, the updates, and the views.


###What are those?

The model is a set of properties defining our game. In our case, it will be some input from the user, size of the game, position of the different elements, number of elements and the list goes on.

The updates are the way the elements of the game are changing. How do we change the position of an element, depending on the inputs we received. This can sound a bit abstract, but it will be easy to understand later on.

Finally, the views are the visual representation of our model, what we are going to draw on the screen, the visual feedback we give to the user.


Moreover, the way I described the game gives us a nice way of implementing it.
We are going to take care of the spaceship first, the missiles after, and finally the enemies.


###Implementation of the spaceship component

Our game will contain a unique spaceship, located at the bottom center of our scene.
To represent it, we decided on drawing a triangle.

First, how are we going to represent our spaceship?

Our spaceship has a position, which is going to be represented by x and y attributes. But, it also has a rotation property, because we want the spaceship to be able to turn.

we can then represent our spaceship using the following in Elm:

	type Spaceship = {x:Float, y:Float, rotation:Float}

and we can also create our Game type

	type Game = {spaceship:Spaceship}

We create a record having the type ```Spaceship```. This is comparable to having a class in OOP. For more information, you should check this [documentation](http://elm-lang.org/learn/Records.elm). It is going to be useful for the rest of this post.

Now that we have our model, we should create the view for it. I said we were going to use a triangle to represent our spaceship.
Let's see how we can do that in Elm.

We need to create a [```Form```](http://elm-lang.org/learn/courses/beginner/Graphics.elm) in Elm to represent our spaceship.


It is pretty easy to do.

	drawSpaceship spaceship clr = (filled clr (ngon 3 20))

```ngon``` is a function taking two integers as parameters. The first one represents the number of sides that our polygon has, the second one the width of it. So in our case, ```(ngon 3 20)``` means a polygon with 3 sides, 20 pixels of width, therefore it gives us a triangle. Great, now let's give it some style. We just want it to be full of one color, so we are just using the function ```filled```, that we compose with our initial triangle. We could have styled it in some other ways, but for this, you are free to check the documentation.

We have our spaceship but we don't see anything on the screen yet. Let's display it, and we will fix it after.

To display elements on the screen, we are going to use a ```collage```, as explained in the introduction to graphics referenced earlier.

So let's check our first version of display:

    display : (Int, Int) -> Game -> Input -> Element
    display (w,h) {spaceship}  i = collage w h
				[
					move (0, 0) (filled yellow (rect gameWidth gameHeight)),
					(drawSpaceship spaceship red)
				]

OK. A lot of stuff here.
```display``` is a method taking a pair of ints representing the dimension of our window, a ```Game``` record as defined previously, and ```Input``` record, that I am going to explain just after, and it returns a displayable ```Element```.

Now, we wanna make our speaceship to move when we pressed the arrows, by changing its rotation property. This is when signals and inputs are coming into place.

We basically need to detect when we are using the left or right arrow, and rotate our spaceship as a response to the input. Elm provides a signal for this. In short, a [signal](http://library.elm-lang.org/catalog/elm-lang-Elm/0.12.1/Signal) is a value varying over time.
Elm gives us a signal to represent the arrow keys: ```Keyboard.arrows```. This function returns the key pressed by the user as a record:

	{x:Int, y:Int}

x represents left or right pressed, and y representing up or down pressed. To be more specific,
x = -1 means that left is pressed, 1 means that right is pressed. y=-1 means down is pressed as y=1 means that up is pressed.

We are going to use this to know if the user is pressing left or right.
To do so, let's define our Input model:

	type Input = {dir:Int}


We want to have an update on this event mutliple times per second.

	delta = inSeconds <~ fps 35
	input = sampleOn delta (Input <~ lift .x Keyboard.arrows)


```input``` basically means that we want to update the value of the arrows state 35 times per second.

Great, we have now a game model, a input, and a display function. The last piece of the puzzle is to have an update function.

	--stepGame takes an input, a Game instance, and will update and return it.
	stepGame : Input -> Game -> Game
	stepGame ({dir} as input) ({spaceship} as game) =
    	  let spaceship' = moveSpaceship spaceship dir
      	  in { game | spaceship  <- spaceship' }

	moveSpaceship : Spaceship -> Int -> Spaceship
	moveSpaceship spaceship angle =
    	let rotation' = spaceship.rotation - ((toFloat angle) * 5)
    	in {spaceship | rotation <- rotation'}


It is quite a lot of code here. Let's check ```moveSpaceship``` first.
this method takes a spaceship and an angle (from pressing left or right, the value is either -1 or 1). This method will returns a new spaceship.

We set ```rotation'``` to be the actual rotation of the spaceship adding/substracting 5 degrees depending on whether we are pressing left (-1) or right (+1). We assign ```rotation'``` to be the property ```rotation``` of the spaceship we return.

Let's go back to ```stepGame``` now. Our game is only composed of a spaceship, so each update will be only updating the state of the spaceship. We are just calling ```moveSpaceship``` at each step, giving it the current spaceship and the dir property from our input.
At the end, we assign the spaceship returns to be the element spaceship of our game.

To resume, you should have this [code](https://github.com/jrm2k6/space-invaders-elm/blob/master/space_invaders_spaceship_only.elm) doing [this](http://www.share-elm.com/sprout/5379024fe4b0f4abc6a1f05b/stable/view)


###Implementation of the missile component

Now, we want to be able to shoot a missile, and only one for now!
Same procedure as for the spaceship. We create the model part and modify the ```Game``` model.
So a missile is gonna be called a ```Ball```. It will be represented as a record with the property position, horizontal and vertical velocities, an angle, and finally a status.

The status property is needed to know if a missile is flying, out of the screen or colliding, as we expect the missile to interact with some other objects later on.

So here is how we implement this:


	-- the Ball model
	type Ball = {x:Float, y:Float, vx:Float, vy:Float, angle:Float, status:FlyingElementState}
	-- the FlyingElementState record
	data FlyingElementState = Flying | OutOfBounds | Colliding | ReadyToFly

We need to add this new model to the ```Game``` model.


	type Game = {spaceship:Spaceship, ball:Ball}


Let's now implement the view for ball.
The ball is simply going to be a circle filled with a color.
We know how to do this:

	drawBall clr = (filled clr (circle 4))

Let's see further. We know that the ball is going to move on the screen, so we will need to always set the ball position with the values x and y of its model representation.
We can then use the [```move```](http://library.elm-lang.org/catalog/elm-lang-Elm/0.12.1/Graphics-Collage#move) method to manually position the ball on our scene.


	drawBall : Ball -> Color -> Form
	drawBall ball clr = ( move (ball.x, ball.y) (filled clr (circle 4)))


Great, we have now a model and a view for our ball, but how are we going to shoot one when we press space.

So we have to this in two steps: modify the input to add the space key handling, and modify the updateGame method to check if we have to create a ball or not.

To modify the input we can just modify our Input record, to add a boolean which means 'space key is pressed', by using [```Keyboard.space```](http://library.elm-lang.org/catalog/elm-lang-Elm/0.12.1/Keyboard#space).


	delta = inSeconds <~ fps 35
	input = sampleOn delta (Input <~ lift Keyboard.space,
	                 ~ lift .x Keyboard.arrows)


Then let's modify our game instance to put a default ball that we will shoot when pressing space.

	defaultGame : Game
	defaultGame =
	{
	  spaceship = {x=0, y=-halfHeight+40, rotation=90},
	  ball = {x=0, y=-halfHeight+40, vx=200, vy=200, angle=90,
	          status=ReadyToFly}
	}

We add some methods to move the ball when we press space:


	-- moveBall needs to do two things, update the ball position, and the ball
	-- state to know if we have to put back the ball at the origin or not

	moveBall : Ball -> Bool -> Time -> Float -> Ball
	moveBall ({x,y,vx,vy} as ball) space delta angle =
	                    let (x',y') = updateBallPosition ball delta
	                        status' = updateBallState ball space
	                        angle' =  if ball.status == ReadyToFly
	                                  then angle else ball.angle
	                    in { ball | x <- x',
	                                y <- y',
	                                angle <- angle',
	                                status <- status' }


	-- We need to change the state of the ball depending on two things:
	--         - we press space and the ball was not flying
	--         - we reach the bounds of the screen

	updateBallState : Ball -> Bool -> FlyingElementState
	updateBallState ball spacePressed = if ball.y > halfHeight || ball.x < -halfWidth || ball.x > halfWidth then ReadyToFly
	                       else if (ball.status == ReadyToFly) && spacePressed then Flying
	                       else ball.status


	-- We need to change the position of the ball depending on the status. We use pattern-matching for that.
	-- If we are flyingm we need to move the ball up the screen.

	updateBallPosition : Ball -> Time -> (Float,Float)
	updateBallPosition ({x,y,vx,vy,angle,status} as ball) delta =
	                case (x, y, status) of
	                    (_,_,ReadyToFly)  -> (0, -halfHeight+40)
	                    (_,_,Flying)      ->
	                        (x + vx * delta * cos (convertDegreesToRadian angle),
	                        y + vy * delta * sin (convertDegreesToRadian angle))

	-- helper function
	convertDegreesToRadian : Float -> Float
	convertDegreesToRadian angleInDegree = angleInDegree / 180 * pi



###Implementation of the enemy component

The next step is to make an enemy crossing the screen. Should be pretty simple from now on.
So same steps as before, and we end up with this for the enemy part:


	-- model
	type Enemy = {x:Float, y:Float, vx:Float, vy:Float, status:FlyingElementState}

	-- view
	drawEnemy : Enemy -> Color -> Form
	drawEnemy enemy clr = move (enemy.x, enemy.y) (filled clr (ngon 4 15))

	-- we modify the game as follow

	defaultGame : Game
	defaultGame =
	  {
	    spaceship = {x=0, y=-halfHeight+40, rotation=90},
	    ball = {x=0, y=-halfHeight+40, vx=200, vy=200, angle=90, status=ReadyToFly},
	    enemy = {x=100, y=halfHeight-40, vx=200, vy=200, status=Flying}
	  }

	stepGame : Input -> Game -> Game
	stepGame ({space, dir, delta} as input) ({spaceship, ball, enemy} as game) =
	      let spaceship' = moveSpaceship spaceship dir
	          ball' = moveBall ball space delta spaceship.rotation
	          enemy' = moveEnemy enemy delta ball
	      in { game | spaceship  <- spaceship', ball <- ball', enemy <- enemy'}


	-- update part for enemy
	moveEnemy : Enemy -> Time -> Ball -> Enemy
	moveEnemy ({x,y,vx,vy} as enemy) delta ball = let y' = if (y > -halfHeight && y < halfHeight && not (isColliding enemy ball))
	                                                        then y - vy * delta
	                                                        else halfHeight-40
	                        in {enemy | y <- y'}

	isColliding : Enemy -> Ball -> Bool                       
	isColliding enemy ball = (abs (enemy.x - ball.x)) < 30 && (abs (enemy.y - ball.y)) < 30

	-- modify display method
	display : (Int, Int) -> Game -> Input -> Element
	display (w,h) {spaceship, ball, enemy} i  = collage w h [
	                move (0, 0) (filled yellow (rect gameWidth gameHeight)),
	                (drawSpaceship spaceship red),
	                (drawBall ball blue),
	                (drawEnemy enemy green)
	                ]


You can notice that at this point, the enemy disappear when the ball is close, but the ball continues to fly.
It could be a nice exercise to fix this :)

We have a game with a spaceship, a flying missile, a flying enemy.
We still need to:

- have multiple missiles,
- have random enemies coming on the screen at some regular interval,
- detect game over for this simple game (enemy crossing our line)

I am going to go only over the interesting step, as:

- putting an enemy on the screen at regular interval
- making the game having a list of missiles and enemies.


###Display new enemy at regular interval

To do that, we need to modify our input. We need to add some kind of a pulse, that we will store, and compare with the next one. If they are different we need to add an enemy.

The signal will be this:

	pulse = every (0.5 * second)


It means: send me an update every half a second.
We will need to store it in our game model:

	type Game = { spaceship:Spaceship,
	              balls:[Ball],
	              enemies:[Enemy],
	              state:State,
	              lastPulse:Maybe Time,
	              isGameOver:Bool
	            }

You might have noticed that ```lastPulse``` is a ```Maybe Time```. Shortly, it means that ```lastPulse``` is either an empty value (```Empty```), or it contains a value, a ```Just``` type holding a value of type ```Time```. We need this because when we start the game, we won't have any update for the pulse for half a second, but we still need to update the reste of the game as we will receive 35 updates a second.

```Maybe``` are useful in this case, and easy to use. I let you check the documentation for more info.

####Making the game to have a list of missiles and balls.

We have the implementation for one missile and one enemy. Functional languages are really nice to use in my opinion because of this context. We need to go from one to many. We just basically have to replace the ```Ball``` and ```Enemy``` properties by ```[Ball]``` and ```[Enemy]``` properties in the game. We are sure that our implementation is working. We are going to naively use map and filter to be able to handle more enemies and balls.


So for example, when we press space, we just need to push a new ball to our list:

	addBall : [Ball] -> Bool -> Time -> Float -> State -> [Enemy] -> [Ball]
	addBall balls isSpacePressed delta angle state enemies =  
	        let balls' = if isSpacePressed then balls ++ [defaultBall angle] else balls
	        in updateAllBalls balls' delta angle state enemies


To move them all, we just apply the function moveBall to all of them:


	-- this doesn't only move, it also removes the colliding and out of bounds balls from the screen.
	updateAllBalls : [Ball] -> Time -> Float -> State -> [Enemy] -> [Ball]
	updateAllBalls balls delta angle state enemies = filter (\b -> b.status /= Colliding && b.status /= OutOfBounds)
													 (map
													 (\b -> moveBall b delta state angle (checkCollisionsWithEnemies b enemies))
													 balls)


You get the idea.

The final implementation can be found here:
[gist](https://github.com/jrm2k6/space-invaders-elm/blob/master/space_invaders_multi_balls.elm), and the [game](http://share-elm.com/sprout/537d01d0e4b0f4abc6a1f10f/stable/view).

There are some bugs/performance issues with my implementation.
I just wanted to try elm on a real small game.
Here are the small improvements needed:


- find a smarter way of detecting collisions, by splitting the list of balls/enemies in smaller list that you can ditch by just looking at few elements
- add more control to restart the game
- make the enemies come at you instead of just trying to cross the bottom of the screen
- make different types of missiles
- limit the ammo amount


I hope it gives you a better glance at how you can start to use elm, and how to structure a program. I am by no mean saying my implementation is perfect, but it took me only two small afternoons to have it done, and one afternoon to grasp (not in deep details, i admit) most of the FRP and signals concept.

To conclude, I think elm and FRP provides a nice way on iterating on your code. When you have a part of your code which is correct, you can easily extend it without worrying about breaking your previous code. You can really separate the view, the model and the update implementation. You can also create your own tricky signals (thing I don't have here).

If you want better resources, and posts doing correctly what I have attempted to do here, give a look at:

- [Breakout game in Elm](https://github.com/Dobiasd/articles/blob/master/switching_from_imperative_to_functional_programming_with_games_in_Elm.md)
- [2048 in Elm](http://scrambledeggsontoast.github.io/2014/05/09/writing-2048-elm/)

#####Edit: I know the syntax highlighting is not working well, I am going to fix it soon. If it bothers you too much, you can still check the github repo containing the different sources, and the post (with nice colors).#####

#####Edit 2: Give me feedback, I am here to improve whether it is about the content or the writing style #####
