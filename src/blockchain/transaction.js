class Transaction{

    constructor({blockchain}){

        this._blockchain = blockchain;

        this.onProcess = undefined;
        this.onValidation = undefined;

    }

    async processTx({block}){

        if (!this.onValidation) throw "onValidation is null";

        await this.onValidation({ block: block, tx: this, blockchain: this._blockchain });

        if (this.onProcess)
            this.onProcess({block, tx: this, blockchain: this._blockchain});

    }

}

module.exports = Transaction;