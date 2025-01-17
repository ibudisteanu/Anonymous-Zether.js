const ABICoder = require('web3-eth-abi');
const BN = require('bn.js');

const bn128 = require('../utils/bn128.js');
const utils = require('../utils/utils.js');
const consts = require('./../consts');

const { Convolver, FieldVector, FieldVectorPolynomial, GeneratorVector, PolyCommitment, Polynomial } = require('./algebra.js');
const GeneratorParams = require('./../prover/generator-params');

const InnerProductProver = require('./innerproduct');

const ZetherProof = require('./schemas/zether-proof');

class ZetherProver {

    constructor() {
        this.params = new GeneratorParams(64);
        this.ipProver = new InnerProductProver('verifier');
    }

    recursivePolynomials (list, accum, a, b) {
        // as, bs are log(N)-lengthed.
        // returns N-length list of coefficient vectors
        // should take about N log N to compute.
        if (a.length == 0) {
            list.push(accum.coefficients);
            return;
        }

        var aTop = a.pop();
        var bTop = b.pop();
        var left = new Polynomial([aTop.redNeg(), new BN(1).toRed(bn128.q).redSub(bTop)]);
        var right = new Polynomial([aTop, bTop]);
        this.recursivePolynomials(list, accum.mul(left), a, b);
        this.recursivePolynomials(list, accum.mul(right), a, b);
        a.push(aTop);
        b.push(bTop);
    }

    generateProof (statement, witness) {

        var proof = new ZetherProof();

        var statementHash = utils.hash(ABICoder.encodeParameters([
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2]',
            'bytes32[2][]',
            'uint256',
        ], [
            statement.CLn.map( bn128.serialize ),
            statement.CRn.map( bn128.serialize ),
            statement.C.map( bn128.serialize ),
            bn128.serialize( statement.D ),
            statement.y.map( bn128.serialize ),
            statement.epoch,
        ]));

        statement.CLn = new GeneratorVector(statement.CLn);
        statement.CRn = new GeneratorVector(statement.CRn);
        statement.C = new GeneratorVector(statement.C);
        statement.y = new GeneratorVector(statement.y);
        witness.bTransfer = new BN( witness.bTransfer).toRed(bn128.q);
        witness.bFee = new BN(witness.bFee).toRed(bn128.q);
        witness.bDiff = new BN(witness.bDiff).toRed(bn128.q);

        var number = witness['bTransfer'].add(witness['bDiff'].shln(32)); // shln a red? check
        var aL = new FieldVector(number.toString(2, 64).split("").reverse().map((i) => new BN(i, 2).toRed(bn128.q)));
        var aR = aL.plus(new BN(1).toRed(bn128.q).redNeg());
        var alpha = bn128.randomScalar();
        proof.BA = this.params.commit(alpha, aL, aR );
        var sL = new FieldVector(Array.from({ length: 64 }).map(bn128.randomScalar));
        var sR = new FieldVector(Array.from({ length: 64 }).map(bn128.randomScalar));
        var rho = bn128.randomScalar(); // already reduced
        proof.BS = this.params.commit(rho, sL, sR);

        var N = statement['y'].length();
        if (N & (N - 1))
            throw "Size must be a power of 2!"; // probably unnecessary... this won't be called directly.
        var m = new BN(N).bitLength() - 1; // assuming that N is a power of 2?
        // DON'T need to extend the params anymore. 64 will always be enough.
        var r_A = bn128.randomScalar();
        var r_B = bn128.randomScalar();
        var a = new FieldVector(Array.from({ length: 2 * m }).map(bn128.randomScalar));
        var b = new FieldVector((new BN(witness['index'][1]).toString(2, m) + new BN(witness['index'][0]).toString(2, m)).split("").reverse().map((i) => new BN(i, 2).toRed(bn128.q)));
        var c = a.hadamard(b.times(new BN(2).toRed(bn128.q)).negate().plus(new BN(1).toRed(bn128.q))); // check this
        var d = a.hadamard(a).negate();
        var e = new FieldVector([a.getVector()[0].redMul(a.getVector()[m]), a.getVector()[0].redMul(a.getVector()[m])]);
        var f = new FieldVector([a.getVector()[b.getVector()[0].toNumber() * m], a.getVector()[b.getVector()[m].toNumber() * m].redNeg()]);

        proof.A = this.params.commit(r_A, a.concat(d).concat(e));
        proof.B = this.params.commit(r_B, b.concat(c).concat(f));

        var v = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(statementHash),
            bn128.serialize(proof.BA),
            bn128.serialize(proof.BS),
            bn128.serialize(proof.A),
            bn128.serialize(proof.B),
        ]));

        var phi = Array.from({ length: m }).map(bn128.randomScalar);
        var chi = Array.from({ length: m }).map(bn128.randomScalar);
        var psi = Array.from({ length: m }).map(bn128.randomScalar);
        var omega = Array.from({ length: m }).map(bn128.randomScalar);

        var P = [];
        var Q = [];
        this.recursivePolynomials(P, new Polynomial(), a.getVector().slice(0, m), b.getVector().slice(0, m));
        this.recursivePolynomials(Q, new Polynomial(), a.getVector().slice(m), b.getVector().slice(m));
        P = Array.from({ length: m }).map((_, k) => new FieldVector(P.map((P_i) => P_i[k])));
        Q = Array.from({ length: m }).map((_, k) => new FieldVector(Q.map((Q_i) => Q_i[k])));

        proof.CLnG = Array.from({ length: m }).map((_, k) => statement['CLn'].commit(P[k]).add(statement['y'].getVector()[witness['index'][0]].mul(phi[k])));
        proof.CRnG = Array.from({ length: m }).map((_, k) => statement['CRn'].commit(P[k]).add(this.params.getG().mul(phi[k])));
        proof.C_0G = Array.from({ length: m }).map((_, k) => statement['C'].commit(P[k]).add(statement['y'].getVector()[witness['index'][0]].mul(chi[k])));
        proof.DG = Array.from({ length: m }).map((_, k) => this.params.getG().mul(chi[k]));
        proof.y_0G = Array.from({ length: m }).map((_, k) => statement['y'].commit(P[k]).add(statement['y'].getVector()[witness['index'][0]].mul(psi[k])));
        proof.gG = Array.from({ length: m }).map((_, k) => this.params.getG().mul(psi[k]));
        proof.C_XG = Array.from({ length: m }).map((_, k) => statement['D'].mul(omega[k]));
        proof.y_XG = Array.from({ length: m }).map((_, k) => this.params.getG().mul(omega[k]));
        var vPow = new BN(1).toRed(bn128.q);
        for (var i = 0; i < N; i++) { // could turn this into a complicated reduce, but...
            var temp = this.params.getG().mul(vPow);
            var poly = i % 2 ? Q : P; // clunky, i know, etc. etc.

            proof.C_XG = proof.C_XG.map((C_XG_k, k) => C_XG_k.add(temp.mul(witness['bTransfer'].redNeg().redSub( witness.bFee ).redMul(poly[k].getVector()[(witness['index'][0] + N - (i - i % 2)) % N]).redAdd(witness['bTransfer'].redMul(poly[k].getVector()[(witness['index'][1] + N - (i - i % 2)) % N])))));

            if (i != 0)
                vPow = vPow.redMul(v);
        }

        var w = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
        ], [
            bn128.bytes(v),
            proof.CLnG.map(bn128.serialize),
            proof.CRnG.map(bn128.serialize),
            proof.C_0G.map(bn128.serialize),
            proof.DG.map(bn128.serialize),
            proof.y_0G.map(bn128.serialize),
            proof.gG.map(bn128.serialize),
            proof.C_XG.map(bn128.serialize),
            proof.y_XG.map(bn128.serialize),
        ]));

        proof.f = b.times(w).add(a);
        proof.z_A = r_B.redMul(w).redAdd(r_A);

        var y = utils.hash(ABICoder.encodeParameters([
            'bytes32',
        ], [
            bn128.bytes(w), // that's it?
        ]));

        var ys = [new BN(1).toRed(bn128.q)];
        for (var i = 1; i < 64; i++) { // it would be nice to have a nifty functional way of doing this.
            ys.push(ys[i - 1].redMul(y));
        }
        ys = new FieldVector(ys); // could avoid this line by starting ys as a fieldvector and using "plus". not going to bother.
        var z = utils.hash(bn128.bytes(y));
        var zs = [z.redPow(new BN(2)), z.redPow(new BN(3))];
        var twos = [new BN(1).toRed(bn128.q)];
        for (var i = 1; i < 32; i++) {
            twos.push(twos[i - 1].redMul(new BN(2).toRed(bn128.q)));
        }
        var twoTimesZs = [];
        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < 32; j++) {
                twoTimesZs.push(zs[i].redMul(twos[j]));
            }
        }
        twoTimesZs = new FieldVector(twoTimesZs);
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
        var tauX = evalCommit.getR();  // no longer public...
        proof.mu = alpha.redAdd(rho.redMul(x));

        var CRnR = bn128.zero;
        var y_0R = bn128.zero;
        var y_XR = bn128.zero;
        var DR = bn128.zero;
        var gR = bn128.zero;
        var p = new FieldVector(Array.from({ length: N }).map(() => new BN().toRed(bn128.q))); // evaluations of poly_0 and poly_1 at w.
        var q = new FieldVector(Array.from({ length: N }).map(() => new BN().toRed(bn128.q))); // verifier will compute these using f.

        var wPow = new BN(1).toRed(bn128.q);
        for (var k = 0; k < m; k++) {
            CRnR = CRnR.add(this.params.getG().mul(phi[k].redNeg().redMul(wPow)));
            DR = DR.add(this.params.getG().mul(chi[k].redNeg().redMul(wPow)));
            y_0R = y_0R.add(statement['y'].getVector()[witness['index'][0]].mul(psi[k].redNeg().redMul(wPow)));
            gR = gR.add(this.params.getG().mul(psi[k].redNeg().redMul(wPow)));
            y_XR = y_XR.add(proof.y_XG[k].mul(wPow.neg()));
            p = p.add(P[k].times(wPow));
            q = q.add(Q[k].times(wPow));
            wPow = wPow.redMul(w);
        }
        CRnR = CRnR.add(statement['CRn'].getVector()[witness['index'][0]].mul(wPow));
        y_0R = y_0R.add(statement['y'].getVector()[witness['index'][0]].mul(wPow));
        DR = DR.add(statement['D'].mul(wPow));
        gR = gR.add(this.params.getG().mul(wPow));
        p = p.add(new FieldVector(Array.from({ length: N }).map((_, i) => i == witness['index'][0] ? wPow : new BN().toRed(bn128.q))));
        q = q.add(new FieldVector(Array.from({ length: N }).map((_, i) => i == witness['index'][1] ? wPow : new BN().toRed(bn128.q))));

        var convolver = new Convolver();
        var y_p = convolver.convolution(p, statement['y']);
        var y_q = convolver.convolution(q, statement['y']);
        vPow = new BN(1).toRed(bn128.q);
        for (var i = 0; i < N; i++) {
            var y_poly = i % 2 ? y_q : y_p;
            y_XR = y_XR.add(y_poly.getVector()[Math.floor(i / 2)].mul(vPow));
            if (i > 0)
                vPow = vPow.redMul(v);
        }


        var k_sk = bn128.randomScalar();
        var k_r = bn128.randomScalar();
        var k_b = bn128.randomScalar();
        var k_tau = bn128.randomScalar();

        var A_y = gR.mul(k_sk);
        var A_D = this.params.getG().mul(k_r);
        var A_b = this.params.getG().mul(k_b).add(DR.mul(zs[0].redNeg()).add(CRnR.mul(zs[1])).mul(k_sk));
        var A_X = y_XR.mul(k_r);
        var A_t = this.params.getG().mul(k_b.redNeg()).add(this.params.getH().mul(k_tau));
        var A_u = utils.gEpoch(statement['epoch']).mul(k_sk);

        proof.c = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(x),
            bn128.serialize(A_y),
            bn128.serialize(A_D),
            bn128.serialize(A_b),
            bn128.serialize(A_X),
            bn128.serialize(A_t),
            bn128.serialize(A_u),
        ]));

        proof.s_sk = k_sk.redAdd(proof.c.redMul(witness['sk']));
        proof.s_r = k_r.redAdd(proof.c.redMul(witness['r']));
        proof.s_b = k_b.redAdd(proof.c.redMul(witness['bTransfer'].redMul(zs[0]).redAdd(witness['bDiff'].redMul(zs[1])).redMul(wPow)));
        proof.s_tau = k_tau.redAdd(proof.c.redMul(tauX.redMul(wPow)));

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
        proof.ipProof = this.ipProver.generateProof( ipStatement, ipWitness, o);

        return proof;
    }
}

module.exports = ZetherProver;