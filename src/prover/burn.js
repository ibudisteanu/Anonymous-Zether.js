const ABICoder = require('web3-eth-abi');
const BN = require('bn.js');

const bn128 = require('../utils/bn128.js');
const utils = require('../utils/utils.js');
const { GeneratorVector, FieldVector, FieldVectorPolynomial, PolyCommitment } = require('./algebra.js');
const GeneratorParams = require('./../prover/generator-params');

const InnerProductProver = require('./innerproduct');
const BurnProof = require('./schemas/burn-proof');


class BurnProver {

    constructor() {
        this.params = new GeneratorParams(32);
        this.ipProver = new InnerProductProver('burner');
    }

    generateProof (statement, witness) { // salt probably won't be used

        var proof = new BurnProof();

        var statementHash = utils.hash(ABICoder.encodeParameters([
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'uint256',
            'address',
        ], [
            bn128.serialize(statement['CLn']),
            bn128.serialize(statement['CRn']),
            bn128.serialize(statement['y']),
            statement['epoch'],
            statement['sender'],
        ])); // useless to break this out up top. "psychologically" easier

        witness['bDiff'] = new BN(witness['bDiff']).toRed(bn128.q);

        var aL = new FieldVector(witness['bDiff'].toString(2, 32).split("").reverse().map((i) => new BN(i, 2).toRed(bn128.q)));
        var aR = aL.plus(new BN(1).toRed(bn128.q).redNeg());
        var alpha = bn128.randomScalar();
        proof.BA = this.params.commit(alpha, aL, aR);
        var sL = new FieldVector(Array.from({ length: 32 }).map(bn128.randomScalar));
        var sR = new FieldVector(Array.from({ length: 32 }).map(bn128.randomScalar));
        var rho = bn128.randomScalar(); // already reduced
        proof.BS = this.params.commit(rho, sL, sR);

        var y = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(statementHash),
            bn128.serialize(proof.BA),
            bn128.serialize(proof.BS),
        ]));

        var ys = [new BN(1).toRed(bn128.q)];
        for (var i = 1; i < 32; i++) { // it would be nice to have a nifty functional way of doing this.
            ys.push(ys[i - 1].redMul(y));
        }
        ys = new FieldVector(ys); // could avoid this line by starting ys as a fieldvector and using "plus". not going to bother.
        var z = utils.hash(bn128.bytes(y));
        var zs = [z.redPow(new BN(2))];
        var twos = [new BN(1).toRed(bn128.q)];
        for (var i = 1; i < 32; i++) {
            twos.push(twos[i - 1].redMul(new BN(2).toRed(bn128.q)));
        }
        var twoTimesZs = new FieldVector(twos).times(zs[0]);
        var lPoly = new FieldVectorPolynomial(aL.plus(z.redNeg()), sL);
        var rPoly = new FieldVectorPolynomial(ys.hadamard(aR.plus(z)).add(twoTimesZs), sR.hadamard(ys));
        var tPolyCoefficients = lPoly.innerProduct(rPoly); // just an array of BN Reds... should be length 3
        var polyCommitment = new PolyCommitment(this.params, tPolyCoefficients );
        proof.tCommits = new GeneratorVector(polyCommitment.getCommitments()); // just 2 of them

        var x = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(z),
            ...polyCommitment.getCommitments().map(bn128.serialize),
        ]));

        var evalCommit = polyCommitment.evaluate(x);
        proof.tHat = evalCommit.getX();
        var tauX = evalCommit.getR();
        proof.mu = alpha.redAdd(rho.redMul(x));

        var k_sk = bn128.randomScalar();
        var k_b = bn128.randomScalar();
        var k_tau = bn128.randomScalar();

        var A_y = this.params.getG().mul(k_sk);
        var A_b = this.params.getG().mul(k_b).add(statement['CRn'].mul(zs[0]).mul(k_sk));
        var A_t = this.params.getG().mul(k_b.redNeg()).add( this.params.getH().mul(k_tau));
        var A_u = utils.gEpoch(statement['epoch']).mul(k_sk);

        proof.c = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(x),
            bn128.serialize(A_y),
            bn128.serialize(A_b),
            bn128.serialize(A_t),
            bn128.serialize(A_u),
        ]));


        proof.s_sk = k_sk.redAdd(proof.c.redMul(witness['sk']));
        proof.s_b = k_b.redAdd(proof.c.redMul(witness['bDiff'].redMul(zs[0])));
        proof.s_tau = k_tau.redAdd(proof.c.redMul(tauX));


        var gs = this.params.getGs();
        var hPrimes = this.params.getHs().hadamard(ys.invert());
        var hExp = ys.times(z).add(twoTimesZs);
        var P = proof.BA.add(proof.BS.mul(x)).add(gs.sum().mul(z.redNeg())).add(hPrimes.commit(hExp)); // rename of P
        P = P.add(this.params.getH().mul(proof.mu.redNeg())); // Statement P of protocol 1. should this be included in the calculation of v...?

        var o = utils.hash(ABICoder.encodeParameters([
            'bytes32',
        ], [
            bn128.bytes(proof.c),
        ]));

        var u_x = this.params.getG().mul(o); // Begin Protocol 1. this is u^x in Protocol 1. use our g for their u, our o for their x.
        var P = P.add(u_x.mul(proof.tHat)); // corresponds to P' in protocol 1.
        var primeBase = new GeneratorParams(u_x, gs, hPrimes);
        var ipStatement = {
            primeBase: primeBase,
            P: P
        };
        var ipWitness = {
            l: lPoly.evaluate(x),
            r: rPoly.evaluate(x)
        };
        proof.ipProof = this.ipProver.generateProof(ipStatement, ipWitness, o);

        return proof;
    }

}

module.exports = BurnProver;