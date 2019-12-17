class Block {

    constructor({height, timestamp, blockchain, transactions = []}) {

        this._blockchain = blockchain;

        this.height = height;
        this.timestamp = timestamp;
        this.transactions = transactions;

    }

    async executeTransactions(){

        for (let i=0; i < this.transactions.length; i++){

            const tx = this.transactions[i];

            await tx.processTx({block: this});

        }

    }


}

module.exports = Block;