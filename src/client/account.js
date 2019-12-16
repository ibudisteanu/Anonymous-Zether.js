const bn128 = require('./../utils/bn128')

class Account {

    constructor(client) {

        this.client = client;

        this.keypair = undefined;
        this._state = {
            available: 0,
            pending: 0,
            nonceUsed: 0,
            lastRollOver: 0
        };


    }

    _simulate (timestamp, epoch) {

        var updated = {};
        updated.available = this._state.available;
        updated.pending = this._state.pending;
        updated.nonceUsed = this._state.nonceUsed;
        updated.lastRollOver = this.client._getEpoch(timestamp);

        if (this._state.lastRollOver < updated.lastRollOver)
        {
            updated.available += updated.pending;
            updated.pending = 0;
            updated.nonceUsed = false;
        }
        return updated;
    };

    balance () {
        return this._state.available + this._state.pending;
    };

    public  () {
        return this.keypair['y'];
    };

    secret (){
        return bn128.bytes(this.keypair['x']);
    };

}

module.exports = Account;