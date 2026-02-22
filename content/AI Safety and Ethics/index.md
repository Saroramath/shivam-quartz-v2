---
title: AI Safety and Ethics
cssclasses:
  - gallery
---
Why is safe AI impossible to build?


In this article, we will focus on why safe AI is impossible to build from first pronciples.

First lets define what we mean by AI?
For this video, we will focus on best modes we have, which are frontier LLMs but as the field is progressing, that might change because labs are building Ai cabale of continuous learning.

The idea is that we want these systems to Allign with Human values. Alignmnet is such as braod and loaded term. If things were perfectly aligned than we wont have any issues. AI wont do anything that wasn't


Let's break this down into challneges at each level of architecture.

Part 1:
Challenege 1: What values?
It is hard to 


Part 2: 
Making AI do what we want them to do.
Challenge 1: 
Let assume that smart people are solving that problem. How do we communicate this to models?

Option 1: We want a 

Option2: We simply tell models to do that in language. Models have been trained to understadn human languge. 

Currently state of the art looks like a mix of Option 1 and Option 2.

We are giving model 

Our goal into a mathematical function. 

The issues that arise at this level are called Reward misspecification. Where our intention did not match teh goal we gave. 

Now if we want to put the blame on "AI" we might say that model tried to hack the reward. We humans do that all the time. So LLMs have learned to show thios behaviour as well. Whether they have an internal system liek ours that is actiulally doing the hacking is an open question. 



Challenge 2:
Now let's say that we did come up with a mathematical way to define values that do satisfy the 

But how do we know what the model is actually learning?

When we train the model, we usualluy use certain data or environment. The model has a function that it is optimizing for. But when put in a completely new environemnt or tested new data model show completely doifferent behavior. Such behaviour are called Goal misgenerlaizatrion. How do we knwo model is actually learning what we want it to learn. 

let's say model was trained to see

How do we know model is learning to identify 


Interpratability can play some role here. 



Challenge 3:
Well lets say that we did good aount of data and made it robust and now we are ready to deploy the model. We 












We want human values  + We want AI system that follows those values. 












