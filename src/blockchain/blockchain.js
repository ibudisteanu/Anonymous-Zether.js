const Block = require('./block');
const Transaction = require('./transaction')

const Mining = require('./mining');
const consts = require('../consts');
const utils = require('./../utils/utils')

const EventEmitter = require('events').EventEmitter;


class Blockchain{

    constructor(props) {


        this._blocks = {};
        this.mining = new Mining({blockchain: this});
        this.mining.start();

        this._height = -1;

        this.txCounter = 0;
        this.epoch = 0;
        this.epochLength = 10;

        this.events = new EventEmitter();
    }

    getBlock(height){

        return this._blocks[height];

    }

    setBlock(height,block){
        this._blocks[height] = block;
    }

    async pushBlock(block){

        console.info('Block', block.height, ' TX ', block.transactions.length , '  ', this.getEpoch(block.timestamp )% 1000, '  ',  );

        this._blocks[ this.getHeight()+1 ] = block;
        this.setHeight( this.getHeight() +1 );

        await block.executeTransactions();

        if (this.onNewBlock)
            await this.onNewBlock({block});
    }

    getHeight(){
        return this._height;
    }

    setHeight(newValue){
        return this._height = newValue;
    }

    createTransaction(){

        const counter = this.txCounter++;
        const tx = new Transaction({blockchain: this, hash: utils.keccak256Simple( counter.toString() ) });
        return tx;

    }

    away ()  { // returns ms away from next epoch change
        return 60*1000;
    }

    getEpoch (timestamp) {
        return this.epoch;
    }

    incrementEpoch () {
        this.epoch += 1;
    }

}

module.exports = Blockchain;