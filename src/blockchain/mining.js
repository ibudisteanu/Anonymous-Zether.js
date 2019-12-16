
const Block = require('./block');

class Mining{

    constructor({blockchain}) {

        this._blockchain = blockchain;

        this._started = false;

        this.pendingTxs = [];

    }

    start(){
        if (this._started) return false;

        this.continueMining();

        this._started = true;
    }

    stop(){
        if (!this._started) return false;

        clearTimeout(this._interval);

        this._started = false;
    }

    async _createBlock(){

        const height = this._blockchain.getHeight();
        const block = new Block({height: height+1, blockchain: this._blockchain, timestamp: new Date().getTime() });

        for (let i=0; i < this.pendingTxs.length; i++) {
            block.transactions.push(this.pendingTxs[i]);
        }
        this.pendingTxs = [];

        return block;

    }

    async _mineBlock(){


        try{

            const block = await this._createBlock();


            this._interval = undefined;
            await this._blockchain.pushBlock(block);

        }catch(err){
            console.error('Error mining block', err);
        }

        this.continueMining();
    }

    continueMining(){

        if (!this._interval)
            this._interval = setTimeout( this._mineBlock.bind(this),  this._blockchain.BLOCK_TIME_OUT );

    }

    includeTx(tx){

        this.pendingTxs.push( tx );



    }

}

module.exports = Mining;