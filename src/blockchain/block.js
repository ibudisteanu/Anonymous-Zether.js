class Block {

    constructor({height, timestamp, blockchain, transactions = []}) {

        this._blockchain = blockchain;

        this.height = height;
        this.timestamp = timestamp;
        this.transactions = transactions;

    }

    executeTransactions(){

        for (let i=0; i < this.transactions.length; i++){

        }

    }


}

module.exports = Block;