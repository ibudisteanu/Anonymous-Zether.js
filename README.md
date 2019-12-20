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
Idea suggestion by [@benediamond]( https://github.com/benediamond)

A proof `(c,s)` is computed as follows:

![alt text](https://latex.codecogs.com/gif.latex?b) - balance of transaction\
![alt text](https://latex.codecogs.com/gif.latex?i) -  index of the receiver\
![alt text](https://latex.codecogs.com/gif.latex?r) - public view key\
![alt text](https://latex.codecogs.com/gif.latex?%28C_%7Bi%7D%2C%20D%29) - cipher text


Prover - generating proof `(c, s)`
![alt text](https://latex.codecogs.com/gif.latex?g%5E%7Bb%7D%20%5Ccdot%20C_%7Bi%7D%20%3D%20y_%7Bi%7D%5E%7Br%7D) - Claim \
![alt text](https://latex.codecogs.com/gif.latex?g%5E%7Br%7D%20%3D%20D) - `r` such \
![alt text](https://latex.codecogs.com/gif.latex?K_%7Br%7D%20%3D%20g%5E%7Bk%7D) and ![alt text](https://latex.codecogs.com/gif.latex?y_%7Br%7D%20%3D%20Y_%7Bi%7D%5E%7Bk%7D)  - Choosing a random element `k` in `F_q` \
![alt text](https://latex.codecogs.com/gif.latex?c%20%3D%20Hash%28%20K_%7Br%7D%2C%20Y_%7Br%7D%20%29) - computing `c` \
![alt text](https://latex.codecogs.com/gif.latex?s%20%3D%20k%20&plus;%20c%20%5Ccdot%20r) - computing `s`

Verifier - verify proof `(c, s)`
![alt text](https://latex.codecogs.com/gif.latex?K_%7Br%7D%20%3D%20g%5E%7Bs%7D%20%5Ccdot%20D%5E%7B-c%7D) - computing `K_r`\
![alt text](https://latex.codecogs.com/gif.latex?Y_%7Br%7D%20%3D%20y_%7Bi%7D%5E%7Bs%7D%5Ccdot%20%28g%5E%7Bb%7D%5Ccdot%20C_%7Bi%7D%29%5E%7B-c%7D) - computing `Y_r`\
![alt text](https://latex.codecogs.com/gif.latex?c%20%3D%20Hash%28K_%7Br%7D%2C%20Y_%7Br%7D%29) - equation verification

### 3. Todo by priorities:

##### 1. Paying gas in Zether.

It enables Zether to be used as a native currency to pay the gas in Zether to the miners accepting it as gas.

![alt text](https://latex.codecogs.com/gif.latex?gas) - miner fee\
![alt text](https://latex.codecogs.com/gif.latex?b) - amount \
![alt text](https://latex.codecogs.com/gif.latex?%28C_%7Bi%7D%2C%20D%29) - cipher text

![alt text](https://latex.codecogs.com/gif.latex?-gas%20-b) - Homomorphically subtract `b` and `gas` from the sender\
![alt text](https://latex.codecogs.com/gif.latex?&plus;b) - Homomorphically add `b` to the receiver\
![alt text](https://latex.codecogs.com/gif.latex?0) - Homomorphically add `0` to the decoys\
![alt text](https://latex.codecogs.com/gif.latex?gas) - Add `gas` to the miner. Homomorphically add can be performed as well


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
