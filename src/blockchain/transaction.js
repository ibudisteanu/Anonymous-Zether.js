class Transaction{

    constructor({block, blockchain}){

        this._block = block;
        this._blockchain = blockchain;

        this.onProcess = undefined;
    }

    processTx(){

        if (this.onProcess)
            this.onProcess();

    }

}

module.exports = Transaction;