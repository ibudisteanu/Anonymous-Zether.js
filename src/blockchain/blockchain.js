const Block = require('./block');
const Mining = require('./mining');


class Blockchain{

    constructor(props) {

        this._blocks = {};
        this.mining = new Mining({blockchain: this});
        this.mining.start();

        this._height = -1;
    }

    getBlock(height){

        return this._blocks[height];

    }

    setBlock(height,block){
        this._blocks[height] = block;
    }

    pushBlock(block){

        console.info('Block pushed', block.height, ' txs ', block.transactions.length);

        this._blocks[ this.getHeight()+1 ] = block;
        this.setHeight( this.getHeight() +1 );

        block.executeTransactions();

    }

    getHeight(){
        return this._height;
    }

    setHeight(newValue){
        return this._height = newValue;
    }

}

module.exports = new Blockchain();