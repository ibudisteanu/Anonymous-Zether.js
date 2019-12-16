
const BN = require('bn.js');

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

        this._epochLength = undefined;

        this.account = new Account(this);
        this.friends = new Friends(this);

        this.service = new Service();

        ZSC.events.on('transferOccurred', this.onReceivedTransfer.bind(this) );

    }

    async initialize (secret) {

         this._epochLength = ZSC.epochLength;

        if (secret === undefined) {
            var keypair = utils.createAccount();
            this.account.keypair = keypair;
            console.log("New account generated.");

        } else {

            var x = new BN(secret.slice(2), 16).toRed(bn128.q);
            this.account.keypair = { 'x': x, 'y': utils.determinePublicKey(x) };

            const result = ZSC.simulateAccounts([this.account.keypair['y']], this._getEpoch() + 1);

            var simulated = result[0];
            this.account._state.available = utils.readBalance(bn128.unserialize(simulated[0]), bn128.unserialize(simulated[1]), this.account.keypair['x']);
            console.log("Account recovered successfully.");

        }

    };

    onReceivedTransfer(account, parties, transaction ){

        for (let i=0; i < parties.length; i++){

            const party = parties[i];
            if (!this.match(account.keypair['y'], party)) continue;

            account._state = account._simulate(block.timestamp);

            var inputs;
            zsc._jsonInterface.forEach((element) => {
                if (element['name'] == "transfer")
                    inputs = element['inputs'];
            });

            var parameters = web3.eth.abi.decodeParameters(inputs, "0x" + transaction.input.slice(10));
            var value = utils.readBalance(bn128.unserialize(parameters['C'][i]).neg(), bn128.unserialize(parameters['D']).neg(), account.keypair['x']);
            if (value > 0) {
                account._state.pending += value;
                console.log("Transfer of " + value + " received! Balance now " + (account._state.available + account._state.pending) + ".");
            }

        }

    }

    deposit (value) {

        if (this.account.keypair === undefined)
            throw "Client's account is not yet initialized!";

        var account = this.account;

        console.log("Initiating deposit.");

        return Blockchain.mining.includeTx(({block})=>{

            ZSC.fund( {block}, account.keypair['y'], value);

            account._state = account._simulate(); // have to freshly call it
            account._state.pending += value;
            console.log("Deposit of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");

        });

    }

    estimate (size, contract) {
        // this expression is meant to be a relatively close upper bound of the time that proving + a few verifications will take, as a function of anonset size
        // this function should hopefully give you good epoch lengths also for 8, 16, 32, etc... if you have very heavy traffic, may need to bump it up (many verifications)
        // i calibrated this on _my machine_. if you are getting transfer failures, you might need to bump up the constants, recalibrate yourself, etc.
        return Math.ceil(size * Math.log(size) / Math.log(2) * 20 + 5200) + (contract ? 20 : 0);
        // the 20-millisecond buffer is designed to give the callback time to fire (see below).
    }

    transfer (name, value, decoys) {
        if (this.account.keypair === undefined)
            throw "Client's account is not yet initialized!";
        decoys = decoys ? decoys : [];
        var account = this.account;
        var state = account._simulate();
        if (value > state.available + state.pending)
            throw "Requested transfer amount of " + value + " exceeds account balance of " + (state.available + state.pending) + ".";
        var wait = this._away();
        var seconds = Math.ceil(wait / 1000);
        var plural = seconds == 1 ? "" : "s";
        if (value > state.available) {
            console.log("Your transfer has been queued. Please wait " + seconds + " second" + plural + ", for the release of your funds...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }
        if (state.nonceUsed) {
            console.log("Your transfer has been queued. Please wait " + seconds + " second" + plural + ", until the next epoch...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }
        var size = 2 + decoys.length;
        var estimated = this.estimate(size, false); // see notes above

        if (estimated > this._epochLength * 1000)
            throw "The anonset size (" + size + ") you've requested might take longer than the epoch length (" + this._epochLength + " seconds) to prove. Consider re-deploying, with an epoch length at least " + Math.ceil(estimate(size, true) / 1000) + " seconds.";

        if (estimated > wait) {
            console.log(wait < 3100 ? "Initiating transfer." : "Your transfer has been queued. Please wait " + seconds + " second" + plural + ", until the next epoch...");
            return utils.sleep(wait).then(() => this.transfer(name, value, decoys));
        }

        if (size & (size - 1)) {
            var previous = 1;
            var next = 2;
            while (next < size) {
                previous *= 2;
                next *= 2;
            }
            throw "Anonset's size (including you and the recipient) must be a power of two. Add " + (next - size) + " or remove " + (size - previous) + ".";
        }
        var friends = this.friends.show();
        if (!(name in friends))
            throw "Name \"" + name + "\" hasn't been friended yet!";
        if (this.match(friends[name], account.keypair['y']))
            throw "Sending to yourself is currently unsupported (and useless!)."
        var y = [account.keypair['y']].concat([friends[name]]); // not yet shuffled
        decoys.forEach((decoy) => {
            if (!(decoy in friends))
                throw "Decoy \"" + decoy + "\" is unknown in friends directory!";
            y.push(friends[decoy]);
        });
        var index = [];
        var m = y.length;
        while (m != 0) { // https://bost.ocks.org/mike/shuffle/
            var i = Math.floor(Math.random() * m--);
            var temp = y[i];
            y[i] = y[m];
            y[m] = temp;
            if (this.match(temp, account.keypair['y']))
                index[0] = m;
            else if (this.match(temp, friends[name]))
                index[1] = m;
        } // shuffle the array of y's
        if (index[0] % 2 == index[1] % 2) {
            var temp = y[index[1]];
            y[index[1]] = y[index[1] + (index[1] % 2 == 0 ? 1 : -1)];
            y[index[1] + (index[1] % 2 == 0 ? 1 : -1)] = temp;
            index[1] = index[1] + (index[1] % 2 == 0 ? 1 : -1);
        } // make sure you and your friend have opposite parity


        const result = ZSC.simulateAccounts(y, this._getEpoch() );

        var r = bn128.randomScalar();
        var C = y.map((party, i) => bn128.curve.g.mul(i == index[0] ? new BN(value) : i == index[1] ? new BN(-value) : new BN(0)).add(bn128.unserialize(party).mul(r)));
        var D = bn128.curve.g.mul(r);
        var CLn = result.map((simulated, i) => bn128.serialize(bn128.unserialize(simulated[0]).add(C[i].neg())));
        var CRn = result.map((simulated) => bn128.serialize(bn128.unserialize(simulated[1]).add(D.neg())));
        C = C.map(bn128.serialize);
        D = bn128.serialize(D);
        var proof = this.service.proveTransfer( CLn, CRn, C, D, y, state.lastRollOver, account.keypair['x'], r, value, state.available - value, index);
        var u = bn128.serialize(utils.u(state.lastRollOver, account.keypair['x']));

        ZSC.lastGlobalUpdate = state.lastRollOver;
        ZSC.transfer(C, D, y, u, proof);

        account._state = account._simulate(); // have to freshly call it
        account._state.nonceUsed = true;
        account._state.pending -= value;
        console.log("Transfer of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");

    };


    withdraw (value) {
        if (this.account.keypair === undefined)
            throw "Client's account is not yet initialized!";
        var account = this.account;
        var state = account._simulate();
        if (value > state.available + state.pending)
            throw "Requested withdrawal amount of " + value + " exceeds account balance of " + (state.available + state.pending) + ".";
        var wait = this._away();
        var seconds = Math.ceil(wait / 1000);
        var plural = seconds == 1 ? "" : "s";
        if (value > state.available) {
            console.log("Your withdrawal has been queued. Please wait " + seconds + " second" + plural + ", for the release of your funds...");
            return utils.sleep(wait).then(() => this.withdraw(value));
        }
        if (state.nonceUsed) {
            console.log("Your withdrawal has been queued. Please wait " + seconds + " second" + plural + ", until the next epoch...");
            return utils.sleep(wait).then(() => this.withdraw(value));
        }
        if (3100 > wait) { // determined empirically. IBFT, block time 1
            console.log("Initiating withdrawal.");
            return utils.sleep(wait).then(() => this.withdraw(value));
        }


        const result = ZSC.simulateAccounts( [account.keypair['y']], this._getEpoch() );

        var simulated = result[0];
        var CLn = bn128.serialize(bn128.unserialize(simulated[0]).add(bn128.curve.g.mul(new BN(-value))));
        var CRn = simulated[1];
        var proof = this.service.proveBurn(CLn, CRn, account.keypair['y'], value, state.lastRollOver, this._home, account.keypair['x'], state.available - value);
        var u = bn128.serialize(utils.u(state.lastRollOver, account.keypair['x']));

        ZSC.lastGlobalUpdate = state.lastRollOver;
        ZSC.burn( account.keypair['y'], value, u, proof, this._home );

        account._state = account._simulate(); // have to freshly call it
        account._state.nonceUsed = true;
        account._state.pending -= value;

        console.log("Withdrawal of " + value + " was successful. Balance now " + (account._state.available + account._state.pending) + ".");


    };

    _away () { // returns ms away from next epoch change
        var current = (new Date).getTime();
        return Math.ceil(current / (this._epochLength * 1000)) * (this._epochLength * 1000) - current;
    };


    _getEpoch (timestamp) {
        return Math.floor((timestamp === undefined ? (new Date).getTime() / 1000 : timestamp) / this._epochLength);
    };

    match (address, candidate) {
        return address[0] == candidate[0] && address[1] == candidate[1];
    };

}


module.exports = Client;

