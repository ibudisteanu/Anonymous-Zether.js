const BN = require('bn.js');
const ABICoder = require('web3-eth-abi');

const consts = require('./../consts');
const utils = require('../utils/utils.js');
const Service = require('../utils/service.js');
const bn128 = require('../utils/bn128.js');

const Blockchain = require('./../blockchain/blockchain');

const Account = require('./account');
const Friends = require('./friends');

const ZSC = require ('./../js-contracts/zsc');


class Client {

    constructor(home) {

        this._home = home;

        this._transfers = new Set();


        this.account = new Account(this);
        this.friends = new Friends(this);

        this.service = new Service();

        ZSC.events.on('transferOccurred', this.onReceivedTransfer.bind(this) );

    }

    async initialize (secret) {

        if (secret === undefined) {
            const keypair = utils.createAccount();
            this.account.keypair = keypair;
            console.log("New account generated.");

        } else {

            const x = utils.BNFieldfromHex(  secret );
            this.account.keypair = { x, 'y': utils.determinePublicKey(x) };

            this.account.decodeBalance( );

            console.log("Account recovered successfully.");

        }

    };

    //parties = y
    onReceivedTransfer( {block, params: { y, D, C, u, v, v2 }, tx } ){

        console.warn('onReceivedTransfer');

        const parties = y;

        for (let i=0; i < parties.length; i++){

            const party = parties[i];

            if (!this.match( this.account.keypair.y, party )) continue;

            this.account._state = this.account._simulate(block.timestamp);

            //decoding receiver whisper
            const b = utils.BNFieldfromHex( v ).redSub(  utils.hash( bn128.representation( bn128.unserialize(D).mul( utils.BNFieldfromHex ( this.account.keypair.x ) ) ) )  );
            const whisper = b.toString(10 );

            //decoding sender whisper
            const b2 = utils.BNFieldfromHex( v2 ).redSub(  utils.hash( bn128.representation( bn128.unserialize(D).mul( utils.BNFieldfromHex ( this.account.keypair.x ) ) ) )  );
            const whisper2 = b2.toString(10 );

            console.log( "Whispers", whisper, whisper2 );

            try{

                if (  b2.lte(bn128.B_MAX_BN) && b.gte(bn128.B_MAX_BN) ){

                    //sender
                    ZSC.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "whisper", value: b2, type: "sender"  } );

                    const value = ZSC.readBalance( bn128.unserialize( C[i] ), bn128.unserialize( D ), this.account.keypair.x );
                    if (value > 0) {
                        console.log("Transfer of " + value + " sent! Balance now " + ( this.account._state.available + this.account._state.pending) + ".");
                        ZSC.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value, type: "sender"  } );
                    } else throw "Sender couldn't decode";


                } else if (  b.lte(bn128.B_MAX_BN) && b2.gte(bn128.B_MAX_BN) ){

                    //receiver
                    ZSC.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "whisper", value: b, type: "receiver"  } );

                    const value = ZSC.readBalance( bn128.unserialize( C[i] ).neg(), bn128.unserialize( D ).neg(), this.account.keypair.x );
                    if (value > 0) {
                        this.account._state.pending += value;
                        console.log("Transfer of " + value + " received! Balance now " + ( this.account._state.available + this.account._state.pending) + ".");
                        ZSC.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value, type: "receiver"  } );
                    } else throw "Receiver couldn't decode";

                }


            }catch(err){

                const value1 = ZSC.readBalance( bn128.unserialize( C[i] ), bn128.unserialize( D ), this.account.keypair.x );
                const value2 = ZSC.readBalance( bn128.unserialize( C[i].neg() ), bn128.unserialize( D.neg() ), this.account.keypair.x );

                if (value1 > 0) {

                    //sender
                    ZSC.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value1, type: "sender"  } );

                }
                if (value2 > 0){

                    //receiver
                    ZSC.events.emit('transactionReceivedStatus', { tx: tx.hash, update: "real", value: value2, type: "receiver"  } );

                }


            }
        }

    }

    async deposit (value) {

        if (this.account.keypair === undefined)
            throw "Client's account is not yet initialized!";

        const account = this.account;

        console.log("Initiating deposit.");

        const tx = Blockchain.createTransaction();
        tx.onValidation = ({block, tx})=> {
            return ZSC.fund( {block}, account.keypair.y, value);
        };

        Blockchain.mining.includeTx(tx);


        tx.onProcess = ()=>{
            account._state = account._simulate(); // have to freshly call it
            account._state.pending += value;
            console.log("Deposit of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");

        };

    }

    estimate (size, contract) {
        // this expression is meant to be a relatively close upper bound of the time that proving + a few verifications will take, as a function of anonset size
        // this function should hopefully give you good epoch lengths also for 8, 16, 32, etc... if you have very heavy traffic, may need to bump it up (many verifications)
        // i calibrated this on _my machine_. if you are getting transfer failures, you might need to bump up the constants, recalibrate yourself, etc.
        return Math.ceil(size * Math.log(size) / Math.log(2) * 20 + 5200) + (contract ? 200 : 0);
        // the 20-millisecond buffer is designed to give the callback time to fire (see below).
    }

    async transfer (name, value, decoys) {
        if (this.account.keypair === undefined)
            throw "Client's account is not yet initialized!";
        decoys = decoys ? decoys : [];
        const account = this.account;
        const state = account._simulate();
        if (value > state.available + state.pending)
            throw "Requested transfer amount of " + value + " exceeds account balance of " + (state.available + state.pending) + ".";
        const wait = consts.away();
        const seconds = Math.ceil(wait / 1000);
        const plural = seconds === 1 ? "" : "s";
        if (value > state.available) {
            console.log("Your transfer has been queued. Please wait " + seconds + " second" + plural + ", for the release of your funds...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }
        if (state.nonceUsed) {
            console.log("Your transfer has been queued. Please wait " + seconds + " second" + plural + ", until the next epoch...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }
        const size = 2 + decoys.length;
        const estimated = this.estimate(size, true); // see notes above

        if (estimated > consts.EPOCH_LENGTH * 1000)
            throw "The anonset size (" + size + ") you've requested might take longer than the epoch length (" + consts.EPOCH_LENGTH + " seconds) to prove. Consider re-deploying, with an epoch length at least " + Math.ceil(estimate(size, true) / 1000) + " seconds.";

        if (estimated > wait) {
            console.log(wait < 3100 ? "Initiating transfer." : "Your transfer has been queued. Please wait " + seconds + " second" + plural + ", until the next epoch...");
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
        const friends = this.friends.show();
        if (!(name in friends))
            throw "Name \"" + name + "\" hasn't been friended yet!";
        if (this.match(friends[name], account.keypair.y))
            throw "Sending to yourself is currently unsupported (and useless!).";
        const y = [account.keypair.y].concat([friends[name]]); // not yet shuffled
        decoys.forEach((decoy) => {
            if (!(decoy in friends))
                throw "Decoy \"" + decoy + "\" is unknown in friends directory!";
            y.push(friends[decoy]);
        });
        const index = [];
        let m = y.length;
        while (m !== 0) { // https://bost.ocks.org/mike/shuffle/
            const i = Math.floor(Math.random() * m--);
            const temp = y[i];
            y[i] = y[m];
            y[m] = temp;
            if (this.match(temp, account.keypair.y))
                index[0] = m;
            else if (this.match(temp, friends[name]))
                index[1] = m;
        } // shuffle the array of y's
        if (index[0] % 2 === index[1] % 2) {
            const temp = y[index[1]];
            y[index[1]] = y[index[1] + (index[1] % 2 === 0 ? 1 : -1)];
            y[index[1] + (index[1] % 2 === 0 ? 1 : -1)] = temp;
            index[1] = index[1] + (index[1] % 2 === 0 ? 1 : -1);
        } // make sure you and your friend have opposite parity


        const result = ZSC.simulateAccounts(y, consts.getEpoch() );

        const r = bn128.randomScalar();
        let C = y.map((party, i) => bn128.curve.g.mul(i === index[0] ? new BN(value) : i === index[1] ? new BN(-value) : new BN(0)).add(bn128.unserialize(party).mul(r)));
        let D = bn128.curve.g.mul(r);
        const CLn = result.map((simulated, i) => bn128.serialize(bn128.unserialize(simulated[0]).add(C[i].neg())));
        const CRn = result.map((simulated) => bn128.serialize(bn128.unserialize(simulated[1]).add(D.neg())));
        C = C.map(bn128.serialize);
        D = bn128.serialize(D);

        const proof = this.service.proveTransfer( CLn, CRn, C, D, y, state.lastRollOver, account.keypair.x, r, value, state.available - value, index);
        const u = bn128.serialize(utils.u(state.lastRollOver, account.keypair.x));

        //whisper the value to the receiver
        let v = utils.hash( bn128.representation( bn128.unserialize( y[ index[1] ] ).mul( r ) ) );
        v = v.redAdd( new BN(value).toRed(bn128.q) );
        v = bn128.bytes(v);

        //whisper the value to the receiver
        let v2 = utils.hash( bn128.representation( bn128.unserialize( D ).mul( utils.BNFieldfromHex( account.keypair.x ) ) ) );
        v2 = v2.redAdd( new BN(value).toRed(bn128.q) );
        v2 = bn128.bytes(v2);

        const tx = Blockchain.createTransaction();
        tx.onValidation = ({block, tx})=> {
            return ZSC.transfer( {block}, C, D, y, u, proof);
        };


        Blockchain.mining.includeTx(tx);


        tx.onProcess = ({block})=>{

            this._transfers[tx.hash] = tx;

            account._state = account._simulate(); // have to freshly call it
            account._state.nonceUsed = true;
            account._state.pending -= value;

            ZSC.events.emit('transferOccurred', { tx, block, params: { C, D, y, u, v, v2, proof }} );

            console.log("Transfer of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");

            let proof2 = ZSC.proveAmountSender(y, index[1], r);
            proof2 = bn128.serialize(proof2);

            ZSC.verifyAmountSender(value, C, index[1], proof2);

        };


    };


    async withdraw (value) {
        if (this.account.keypair === undefined)
            throw "Client's account is not yet initialized!";
        const account = this.account;
        const state = account._simulate();
        if (value > state.available + state.pending)
            throw "Requested withdrawal amount of " + value + " exceeds account balance of " + (state.available + state.pending) + ".";


        const wait = consts.away();
        const seconds = Math.ceil(wait / 1000);
        const plural = seconds === 1 ? "" : "s";
        if (value > state.available) {
            console.log("Your withdrawal has been queued. Please wait " + seconds + " second" + plural + ", for the release of your funds...");
            return utils.sleep(wait).then(() => this.withdraw(value));
        }
        if (state.nonceUsed) {
            console.log("Your withdrawal has been queued. Please wait " + seconds + " second" + plural + ", until the next epoch...");
            return utils.sleep(wait).then(() => this.withdraw(value));
        }

        if (3100 > wait) { // determined empirically. IBFT, block time 1
            console.log("Initiating withdrawal.", wait);
            return utils.sleep(wait).then(() => this.withdraw(value));
        }

        const result = ZSC.simulateAccounts( [account.keypair.y], consts.getEpoch() );

        const simulated = result[0];
        const CLn = bn128.serialize(bn128.unserialize(simulated[0]).add(bn128.curve.g.mul(new BN(-value))));
        const CRn = simulated[1];
        const proof = this.service.proveBurn(CLn, CRn, account.keypair.y, value, state.lastRollOver, this._home, account.keypair.x, state.available - value);
        const u = bn128.serialize(utils.u(state.lastRollOver, account.keypair.x));

        const tx = Blockchain.createTransaction();
        tx.onValidation = ({block, tx})=> {
            return ZSC.burn( {block}, account.keypair.y, value, u, proof, this._home );
        };

        Blockchain.mining.includeTx(tx);


        tx.onProcess = ()=>{

            account._state = account._simulate(); // have to freshly call it
            account._state.nonceUsed = true;
            account._state.pending -= value;

            console.log("Withdrawal of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");


        };


    };

    match (address, candidate) {
        return address[0] === candidate[0] && address[1] === candidate[1];
    };

}


module.exports = Client;

