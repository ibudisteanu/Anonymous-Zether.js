const bn128 = require('./../utils/bn128');
const consts = require('./../consts');

class Account {

    constructor(client, blockchain, zsc) {

        this._client = client;
        this._blockchain = blockchain;
        this._zsc = zsc;

        this.keypair = undefined;
        this._state = {
            available: 0,
            pending: 0,
            nonceUsed: 0,
            lastRollOver: 0
        };


    }

    _simulate (timestamp) {

        const updated = {};
        updated.available = this._state.available;
        updated.pending = this._state.pending;
        updated.nonceUsed = this._state.nonceUsed;
        updated.lastRollOver = this._blockchain.getEpoch(timestamp);

        if (this._state.lastRollOver < updated.lastRollOver)
        {
            updated.available += updated.pending;
            updated.pending = 0;
            updated.nonceUsed = false;
        }

        return updated;
    }

    balance () {
        return this._state.available + this._state.pending;
    }

    public  () {
        return this.keypair.y;
    }

    secret (){
        return bn128.bytes(this.keypair.x);
    }

    async decodeBalance(){

        const result = await this._zsc.simulateAccounts([ this.keypair.y ], this._blockchain.getEpoch() + 1);

        const simulated = result[0];

        this._state.available = await this._zsc.readBalance( simulated[0], simulated[1], this.keypair.x );


    }

}

module.exports = Account;