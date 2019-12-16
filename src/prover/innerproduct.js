const ABICoder = require('web3-eth-abi');

const { GeneratorParams, FieldVector } = require('./algebra.js');

const InnerProductProof = require('./schemas/inner-product-proof');

const bn128 = require('../utils/bn128.js');
const utils = require('../utils/utils.js');


class InnerProductProver {

    constructor(type) {
        this._type = type;
    }

    _generateProof (base, P, as, bs, ls, rs, previousChallenge) {
        var n = as.length();
        if (n == 1) {
            var proof = new InnerProductProof(this._type);
            proof.ls = ls;
            proof.rs = rs;
            proof.a = as.getVector()[0];
            proof.b = bs.getVector()[0];
            return proof;
        }
        var nPrime = n / 2;
        var asLeft = as.slice(0, nPrime);
        var asRight = as.slice(nPrime);
        var bsLeft = bs.slice(0, nPrime);
        var bsRight = bs.slice(nPrime);
        var gLeft = base.getGs().slice(0, nPrime);
        var gRight = base.getGs().slice(nPrime);
        var hLeft = base.getHs().slice(0, nPrime);
        var hRight = base.getHs().slice(nPrime);

        var cL = asLeft.innerProduct(bsRight);
        var cR = asRight.innerProduct(bsLeft);

        var u = base.getH();
        var L = gRight.commit(asLeft).add(hLeft.commit(bsRight)).add(u.mul(cL));
        var R = gLeft.commit(asRight).add(hRight.commit(bsLeft)).add(u.mul(cR));
        ls.push(L);
        rs.push(R);

        var x = utils.hash(ABICoder.encodeParameters(['bytes32', 'bytes32[2]', 'bytes32[2]'], [bn128.bytes(previousChallenge), bn128.serialize(L), bn128.serialize(R)]));
        var xInv = x.redInvm();
        var gPrime = gLeft.times(xInv).add(gRight.times(x));
        var hPrime = hLeft.times(x).add(hRight.times(xInv));
        var aPrime = asLeft.times(x).add(asRight.times(xInv));
        var bPrime = bsLeft.times(xInv).add(bsRight.times(x));

        var PPrime = L.mul(x.redMul(x)).add(R.mul(xInv.redMul(xInv))).add(P);
        var basePrime = new GeneratorParams(u, gPrime, hPrime);

        return this._generateProof(basePrime, PPrime, aPrime, bPrime, ls, rs, x);
    };

    generateProof (statement, witness, salt) {
        return this._generateProof(statement['primeBase'], statement['P'], witness['l'], witness['r'], [], [], salt);
    };

}

module.exports = InnerProductProver;