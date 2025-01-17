const BN = require('bn.js');

const utils = require('../utils/utils.js');
const bn128 = require('../utils/bn128.js');

const Account = require('./account');
const Service = require('./../utils/service');

class Client {

    constructor(zsc, blockchain, home) {

        this._blockchain = blockchain;
        this._zsc = zsc;
        this._home = home;

        this._transfers = new Set();

        this.account = new Account(this, this._blockchain, this._zsc);

        this._blockchain.events.on('transferOccurred', this.onReceivedTransfer.bind(this) );

    }

    async register (secret) {

        if ( !secret ) {

            this.account.keypair = utils.createAccount();
            console.log("New account generated.");

            var [c, s] = utils.sign( this._zsc.address, this.account.keypair);

            await this._zsc.register( this.account.keypair.y , c, s);

        } else {

            const x = utils.BNFieldfromHex(  secret );
            this.account.keypair = { x, y: utils.determinePublicKey(x) };

            await this.account.decodeBalance( );  // warning: won't register you. assuming you registered when you first created the account.

            console.log("Account recovered successfully.");

        }

    };

    //parties = y
    async onReceivedTransfer( {block, params: { y, D, C, u, v, v2 }, tx } ){

        console.warn('onReceivedTransfer');

        const parties = y;

        for (let i=0; i < parties.length; i++){

            const party = parties[i];

            if ( !this.match( this.account.keypair.y, party )) continue;

            this.account._state = this.account._simulate(block.timestamp);

            //decoding receiver whisper
            const b = v.redSub(  utils.hash( bn128.representation( D.mul( this.account.keypair.x ) ) )  );
            const whisper = b.toString(10 );

            //decoding sender whisper
            const b2 = v2.redSub(  utils.hash( bn128.representation( D.mul( this.account.keypair.x ) ) )  );
            const whisper2 = b2.toString(10 );

            console.log( "Whispers", whisper, whisper2 );

            try{

                if (  b2.lte(bn128.B_MAX_BN) && b.gte(bn128.B_MAX_BN) ){

                    //sender
                    this._blockchain.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "whisper", value: b2, type: "sender"  } );

                    const value = await this._zsc.readBalance( C[i], D, this.account.keypair.x, true );
                    if (value > 0) {
                        console.log("Transfer of " + value + " sent! Balance now " + ( this.account._state.available + this.account._state.pending) + ".");
                        this._blockchain.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value, type: "sender"  } );
                    } else throw "Sender couldn't decode";


                } else if (  b.lte(bn128.B_MAX_BN) && b2.gte(bn128.B_MAX_BN) ){

                    //receiver
                    this._blockchain.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "whisper", value: b, type: "receiver"  } );

                    const value = await this._zsc.readBalance( C[i], D, this.account.keypair.x );
                    if (value > 0) {
                        this.account._state.pending += value;
                        console.log("Transfer of " + value + " received! Balance now " + ( this.account._state.available + this.account._state.pending) + ".");
                        this._blockchain.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value, type: "receiver"  } );
                    } else throw "Receiver couldn't decode";

                }


            }catch(err){

                const value1 = await this._zsc.readBalance( C[i], D , this.account.keypair.x, true);
                const value2 = await this._zsc.readBalance( C[i], D, this.account.keypair.x );

                if (value1 > 0) {

                    //sender
                    this._blockchain.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value1, type: "sender"  } );

                }
                if (value2 > 0){

                    //receiver
                    this._blockchain.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value2, type: "receiver"  } );

                }


            }
        }

    }

    async deposit (value) {

        if ( !this.account.keypair) throw "Client's account is not yet initialized!";

        const account = this.account;

        console.log( "Initiating deposit." );

        const tx = this._blockchain.createTransaction();
        tx.onValidation = ({block, tx})=> {
            return this._zsc.fund(  account.keypair.y, value);
        };

        this._blockchain.mining.includeTx(tx);


        tx.onProcess = ()=>{

            account._state = account._simulate(); // have to freshly call it
            account._state.pending += value;
            console.log("Deposit of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");
            this._blockchain.incrementEpoch();

        };

    }

    estimate (size, contract) {
        // this expression is meant to be a relatively close upper bound of the time that proving + a few verifications will take, as a function of anonset size
        // this function should hopefully give you good epoch lengths also for 8, 16, 32, etc... if you have very heavy traffic, may need to bump it up (many verifications)
        // i calibrated this on _my machine_. if you are getting transfer failures, you might need to bump up the constants, recalibrate yourself, etc.
        return Math.ceil(size * Math.log(size) / Math.log(2) * 20 + 5200) + (contract ? 200 : 0);
        // the 20-millisecond buffer is designed to give the callback time to fire (see below).
    }

    async transfer ( destinationPublicKey, value, fee, decoys = []) {


        if ( !this.account.keypair )
            throw "Client's account is not yet initialized!";

        const account = this.account;
        const state = account._simulate();
        if (value > state.available + state.pending)
            throw "Requested transfer amount of " + value + " (plus fee of " + fee + ") exceeds account balance of " + (state.available + state.pending) + ".";

        const wait = this._blockchain.away();
        const seconds = Math.ceil(wait / 1000);

        if (value + fee > state.available) {
            console.log("Your transfer has been queued. Please wait " + seconds + " second, for the release of your funds...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }
        if (state.nonceUsed) {
            console.log("Your transfer has been queued. Please wait " + seconds + " second, until the next epoch...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }
        const size = 2 + decoys.length;
        const estimated = this.estimate(size, true); // see notes above

        if (estimated > this._blockchain.epochLength * 1000)
            throw "The anonset size (" + size + ") you've requested might take longer than the epoch length (" + this._blockchain.epochLength + " seconds) to prove. Consider re-deploying, with an epoch length at least " + Math.ceil(this.estimate(size, true) / 1000) + " seconds.";

        if (estimated > wait) {
            console.log(wait < 3100 ? "Initiating transfer." : "Your transfer has been queued. Please wait " + seconds + " second, until the next epoch...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }

        if (size & (size - 1)) {
            let previous = 1;
            let next = 2;
            while (next < size) {
                previous *= 2;
                next *= 2;
            }
            throw "Anonset's size (including you and the recipient) must be a power of two. Add " + (next - size) + " or remove " + (size - previous) + ".";
        }

        if (this.match(  destinationPublicKey, account.keypair.y ) )
            throw "Sending to yourself is currently unsupported (and useless!).";

        const y = [account.keypair.y, destinationPublicKey]; // not yet shuffled
        for (const decoy of decoys)
            y.push(decoy);


        const index = [];
        let m = y.length;
        while (m !== 0) { // https://bost.ocks.org/mike/shuffle/
            const i = Math.floor(Math.random() * m--);
            const temp = y[i];
            y[i] = y[m];
            y[m] = temp;
            if (this.match(temp, account.keypair.y))
                index[0] = m;
            else if (this.match(temp, destinationPublicKey))
                index[1] = m;
        } // shuffle the array of y's
        if (index[0] % 2 === index[1] % 2) {
            const temp = y[index[1]];
            y[index[1]] = y[index[1] + (index[1] % 2 === 0 ? 1 : -1)];
            y[index[1] + (index[1] % 2 === 0 ? 1 : -1)] = temp;
            index[1] = index[1] + (index[1] % 2 === 0 ? 1 : -1);
        } // make sure you and your friend have opposite parity

        const result = await this._zsc.simulateAccounts(y, this._blockchain.getEpoch() );

        const unserialized = result.map(account => account );

        if (unserialized.some((account) => account[0].eq(bn128.zero) && account[1].eq(bn128.zero)))
            throw new Error("Please make sure all parties (including decoys) are registered."); // todo: better error message, i.e., which friend?

        const r = bn128.randomScalar();
        let C = y.map((party, i) => bn128.curve.g.mul(i === index[0] ? new BN( -value - fee ) : i === index[1] ? new BN(value ) : new BN(0)).add( party.mul(r)));

        let D = bn128.curve.g.mul(r);
        let CLn = unserialized.map((account, i) =>  account[0].add( C[i] ));
        let CRn = unserialized.map((account) => account[1].add( D ));

        const proof = Service.proveTransfer( CLn, CRn, C, D, y, state.lastRollOver, account.keypair.x, r, value, fee, state.available - value - fee, index);
        const u = utils.u(state.lastRollOver, account.keypair.x);

        //whisper the value to the receiver
        let v = utils.hash( bn128.representation( y[ index[1] ].mul( r )  ));
        v = v.redAdd( new BN(value).toRed(bn128.q) );

        //whisper the value to the sender
        let v2 = utils.hash( bn128.representation( D.mul(  account.keypair.x ) ) );
        v2 = v2.redAdd( new BN(value ).toRed(bn128.q) );

        const tx = this._blockchain.createTransaction();
        tx.onValidation = ({block, tx})=> {
            return this._zsc.transfer(  C, D, y, u, proof, fee );
        };


        this._blockchain.mining.includeTx(tx);


        tx.onProcess = ({block})=>{

            this._transfers[tx.hash] = tx;

            account._state = account._simulate(); // have to freshly call it
            account._state.nonceUsed = true;
            account._state.pending -= value + fee;

            this._blockchain.events.emit('transferOccurred', { tx, block, params: { C, D, y, u, v, v2, proof }} );

            console.log("Transfer of " + value + " (with fee of " + fee + ") was successful. Balance now " + (account._state.available + account._state.pending) + ".");

            const proof2 = this._zsc.proveAmountSender(y, index[0], r);
            this._zsc.verifyAmountSender(value+fee, index[0], y, C, D, proof2);

            this._blockchain.incrementEpoch();
        };


    }


    async withdraw (value) {

        if (!this.account.keypair )
            throw "Client's account is not yet initialized!";

        const account = this.account;
        const state = account._simulate();
        if (value > state.available + state.pending)
            throw "Requested withdrawal amount of " + value + " exceeds account balance of " + (state.available + state.pending) + ".";


        const wait = this._blockchain.away();
        const seconds = Math.ceil(wait / 1000);
        if (value > state.available) {
            console.log("Your withdrawal has been queued. Please wait " + seconds + " second, for the release of your funds...");
            return utils.sleep(wait).then(() => this.withdraw(value));
        }
        if (state.nonceUsed) {
            console.log("Your withdrawal has been queued. Please wait " + seconds + " second, until the next epoch...");
            return utils.sleep(wait).then(() => this.withdraw(value));
        }

        if (3100 > wait) { // determined empirically. IBFT, block time 1
            console.log("Initiating withdrawal.", wait);
            return utils.sleep(wait).then(() => this.withdraw(value));
        }

        let result = await this._zsc.simulateAccounts( [account.keypair.y], this._blockchain.getEpoch() );

        const simulated = result[0];
        const CLn = simulated[0].add(bn128.curve.g.mul(new BN(-value)));
        const CRn = simulated[1];
        const proof = Service.proveBurn(CLn, CRn, account.keypair.y, state.lastRollOver, this._home, account.keypair.x, state.available - value);
        const u = utils.u(state.lastRollOver, account.keypair.x);

        const tx = this._blockchain.createTransaction();
        tx.onValidation = ({block, tx})=> {
            return this._zsc.burn( account.keypair.y, value, u, proof, this._home );
        };

        this._blockchain.mining.includeTx(tx);


        tx.onProcess = ()=>{

            account._state = account._simulate(); // have to freshly call it
            account._state.nonceUsed = true;
            account._state.pending -= value;

            console.log("Withdrawal of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");
            this._blockchain.incrementEpoch();

        };


    }

    match (address, candidate) {
        return address.eq(candidate);
    }

}


module.exports = Client;

