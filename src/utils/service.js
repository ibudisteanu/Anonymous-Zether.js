const ZetherProver = require('../prover/zether.js');
const BurnProver = require('../prover/burn.js');


class Service {

    constructor() {
        this.zether = new ZetherProver();
        this.burn = new BurnProver();
    }

    proveTransfer (CLn, CRn, C, D, y, epoch, sk, r, bTransfer, bDiff, index) { // no longer async.

        console.log('CLn', CLn);
        console.log('CRn', CRn);
        console.log( 'C', C );
        console.log( 'D', D );
        console.log( 'y', y );
        console.log( 'epoch', epoch);
        console.log( 'sk', sk.toString(16) );
        console.log( 'r', r.toString(16) );
        console.log( "bTransfer", bTransfer );
        console.log( "bDiff", bDiff);
        console.log( "index", index);

        // CLn, CRn, Y, x are "live" (point, BN etc)
        // epoch, bTransfer, bDiff, index are "plain / primitive" JS types.
        var statement = {};
        statement['CLn'] = CLn;
        statement['CRn'] = CRn;
        statement['C'] = C;
        statement['D'] = D;
        statement['y'] = y;
        statement['epoch'] = epoch;

        var witness = {};
        witness['sk'] = sk;
        witness['r'] = r;
        witness['bTransfer'] = bTransfer;
        witness['bDiff'] = bDiff;
        witness['index'] = index;

        return this.zether.generateProof(statement, witness).serialize();
    };


    proveBurn (CLn, CRn, y, bTransfer, epoch, sender, sk, bDiff) {
        var statement = {};
        statement['CLn'] = CLn;
        statement['CRn'] = CRn;
        statement['y'] = y;
        statement['bTransfer'] = bTransfer;
        statement['epoch'] = epoch;
        statement['sender'] = sender;

        var witness = {};
        witness['sk'] = sk;
        witness['bDiff'] = bDiff;

        return this.burn.generateProof(statement, witness).serialize();
    }

}

module.exports = Service;