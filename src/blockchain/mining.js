const BLOCK_TIME_OUT = 1000;

const Block = require('./block');

class Mining{

    constructor({blockchain}) {

        this._blockchain = blockchain;

        this._started = false;

    }

    start(){
        if (this._started) return false;

        this._interval = setTimeout( this._mineBlock.bind(this),  BLOCK_TIME_OUT );

        this._started = true;
    }

    stop(){
        if (!this._started) return false;

        clearTimeout(this._interval);

        this._started = false;
    }

    _mineBlock(){

        try{

            const height = this._blockchain.getHeight();
            const block = new Block({height: height+1, blockchain: this._blockchain, timestamp: new Date().getTime() });

            this._blockchain.pushBlock(block);

        }catch(err){

        }

        this._interval = setTimeout( this._mineBlock.bind(this),  BLOCK_TIME_OUT );

    }

}

module.exports = Mining;