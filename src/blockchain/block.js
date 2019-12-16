class Block {

    constructor({height, timestamp, blockchain, transactions = []}) {

        this._blockchain = blockchain;

        this.height = height;
        this.timestamp = timestamp;
        this.transactions = transactions;

    }

    executeTransactions(){

        for (let i=0; i < this.transactions.length; i++){
            const tx = this.transactions[i];

            tx.processTx();

        }

    }


}

module.exports = Block;