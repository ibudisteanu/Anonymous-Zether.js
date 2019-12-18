# Anonymous Zether in Javascript

Anonymous Zether solidity contracts developed by J.P. Morgan and implemented in pure Javascript.

Improvements :
    1. Whisper protocol
        Idea suggestion from JP Morgan

Given:

![alt text](https://latex.codecogs.com/gif.latex?b) - balance of transaction
![alt text](https://latex.codecogs.com/gif.latex?i) -  index of the receiver
![alt text](https://latex.codecogs.com/gif.latex?y_%7Bi%7D) - public key of the receiver
![alt text](https://latex.codecogs.com/gif.latex?x_%7Bi%7D) - secret of the receiver
![alt text](https://latex.codecogs.com/gif.latex?r) - public view key  

![alt text](doc/zk-1.gif?raw=true)

![alt text](doc/zk-2.gif?raw=true)



Todo by priorities:

    1. Paying gas in Zether. It will enable Zether to be used as a native currency to pay the gas in Zether to the miners accepting it as gas.

Additionally, we could add a few more features:

    1. Proving the amount to the receiver without revealing the sender address.

# References

1. J.P. Morgan codebase of Zether https://github.com/jpmorganchase/anonymous-zether
2. J.P. Morgan - Anonymous Zether Proposal and Tehnical Report https://github.com/jpmorganchase/anonymous-zether/blob/master/docs/AnonZether.pdf
3. J.P. Morgan Additional features on Zether https://github.com/jpmorganchase/anonymous-zether/blob/master/docs/AnonZether.pdf
4. Zether: Towards Privacy in a Smart Contract World https://crypto.stanford.edu/~buenz/papers/zether.pdf

## Special thanks

We want to express our gratitude for the implementation and the help offered on slack and github to:

Benjamin Diamond
[@benediamond]( https://github.com/benediamond)

J.P. Morgan
[@jpmorganchase]( https://github.com/jpmorganchase)

