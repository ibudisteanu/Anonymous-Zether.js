const ZetherProver = require('../prover/zether.js');
const BurnProver = require('../prover/burn.js');


class Service {

    constructor() {
        this.zether = new ZetherProver();
        this.burn = new BurnProver();
    }

    proveTransfer (CLn, CRn, C, D, y, epoch, sk, r, bTransfer, bFee, bDiff, index) {

        const statement = {
            CLn,
            CRn,
            C,
            D,
            y,
            epoch,
        };

        const witness = {
            sk,
            r,
            bTransfer,
            bFee,
            bDiff,
            index
        };

        return this.zether.generateProof(statement, witness).serialize();
    };


    proveBurn (CLn, CRn, y, epoch, sender, sk, bDiff) {

        const statement = {
            CLn,
            CRn,
            y,
            epoch,
            sender,
        };

        const witness = {
            sk,
            bDiff,
        };

        return this.burn.generateProof(statement, witness).serialize();
    }

}

module.exports = new Service();