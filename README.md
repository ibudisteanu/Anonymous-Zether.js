# Anonymous Zether in Javascript

Anonymous Zether solidity contracts developed by J.P. Morgan and implemented in pure Javascript.

## Improvements :

### 1. Whisper protocol

Whisper the balance `b` on chain by encrypting `b` using the shared secret.
Idea suggestion by Zhou Zhiyao [@zzy96]( https://github.com/zzy96)


##### 1.1 Whisper to receiver:

Given:

![alt text](https://latex.codecogs.com/gif.latex?b) - balance of transaction\
![alt text](https://latex.codecogs.com/gif.latex?i) -  index of the receiver\
![alt text](https://latex.codecogs.com/gif.latex?y_%7Bi%7D) - public key of the receiver\
![alt text](https://latex.codecogs.com/gif.latex?x_%7Bi%7D) - secret of the receiver\
![alt text](https://latex.codecogs.com/gif.latex?r) - public view key

Computing the proof hiding the balance for receiver\
![alt text](doc/whisper-receiver-1.gif?raw=true)

Retrieving the secret balance from the sender\
![alt text](doc/whisper-receiver-2.gif?raw=true)

##### 1.2 Whisper to sender:

![alt text](https://latex.codecogs.com/gif.latex?i) -  index of the sender\
![alt text](https://latex.codecogs.com/gif.latex?x_%7Bi%7D) - secret of the sender\

Computing the proof hiding the balance for receiver\
![alt text](doc/whisper-sender-1.gif?raw=true)

Retrieving the secret balance from the sender
![alt text](doc/whisper-sender-2.gif?raw=true)


### 2. Proving amount and receiver without revealing sender

Proving to someone that the transaction sent amount `b` to the receiver `i` without revealing who the sender was.

![alt text](https://latex.codecogs.com/gif.latex?b) - balance of transaction\
![alt text](https://latex.codecogs.com/gif.latex?i) -  index of the receiver\
![alt text](https://latex.codecogs.com/gif.latex?r) - public view key\
![alt text](https://latex.codecogs.com/gif.latex?%28C_%7Bi%7D%2C%20D%29) - cipher text

![alt text](doc/proving-amount-sender.gif?raw=true)

### 3. Todo by priorities:

##### 1. Paying gas in Zether.

It will enable Zether to be used as a native currency to pay the gas in Zether to the miners accepting it as gas.

Additionally, we could add a few more features:

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


Zhou Zhiyao
[@zzy96]( https://github.com/zzy96) for the Whisper Protocol
