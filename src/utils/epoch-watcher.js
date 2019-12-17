const consts = require('../consts');

class EpochWatcher{

    constructor(){

        setInterval( this.tick, 500 );

        this._prevEpoch = undefined;

    }

    tick(){

        const epoch = consts.getEpoch();

        if (this._prevEpoch !== epoch){
            console.warn('EPOCH', epoch);
            this._prevEpoch = epoch;
        }

    }

}

module.exports = new EpochWatcher();