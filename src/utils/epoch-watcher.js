class EpochWatcher{

    constructor(blockchain){

        setInterval( this.tick, 100 );

        this._prevEpoch = undefined;
        this._blockchain = blockchain;

    }

    tick(){

        const epoch = this._blockchain.getEpoch();

        if (this._prevEpoch !== epoch){
            console.warn('EPOCH', epoch % 1000);
            this._prevEpoch = epoch;
        }

    }

}

module.exports = EpochWatcher;