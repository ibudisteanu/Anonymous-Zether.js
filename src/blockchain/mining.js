const BLOCK_TIME_OUT = 1000;

const Block = require('./block');

class Mining{

    constructor({blockchain}) {

        this._blockchain = blockchain;

        this._started = false;

        this._includeTxPromise = null;
        this._includeTxPromiseResolver = null;
        this._includeTxCallbacks = [];

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

    async _mineBlock(){

        try{

            const height = this._blockchain.getHeight();
            const block = new Block({height: height+1, blockchain: this._blockchain, timestamp: new Date().getTime() });

            if (this._includeTxPromise){

                const resolver = this._includeTxPromiseResolver;
                const callbacks = this._includeTxCallbacks;

                this._includeTxPromise = null;
                this._includeTxPromiseResolver = null;
                this._includeTxCallbacks = [];

                for (let i=0; i < callbacks.length; i++)
                    await callbacks[i]( {block} );

                resolver(true);

            }

            await this._blockchain.pushBlock(block);

        }catch(err){
            console.error('Error mining block', err);
        }

        this._interval = setTimeout( this._mineBlock.bind(this),  BLOCK_TIME_OUT );

    }

    includeTx(cb){

        if (!this._includeTxPromise) {

            this._includeTxCallbacks = [];
            this._includeTxPromise = new Promise((resolve) => {
                this._includeTxPromiseResolver = resolve;
            });

        }

        this._includeTxCallbacks.push(cb);

        return this._includeTxPromise;

    }

}

module.exports = Mining;