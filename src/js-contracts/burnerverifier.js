const bn128 = require("./../utils/bn128");
const utils = require('./../utils/utils');
const ABICoder = require('web3-eth-abi');

const BN = require('bn.js');

const BurnStatement = require('./../prover/schemas/burn-statement');
const BurnProof = require('./../prover/schemas/burn-proof');
const BurnAuxiliaries = require('./../prover/schemas/burn-auxiliaries');
const SigmaAuxiliaries = require('./../prover/schemas/sigma-auxiliaries');

const CommonVerifier = require('./common-verifiers');

const g_n = utils.gBurn_n;
const g_m = utils.gBurn_m;

class BurnVerifier{

    constructor(){

        this._commonVerifier = new CommonVerifier( 'burner',  g_m, g_n);

    }

    verifyBurn(CLn, CRn, y, epoch, u, sender, proof){


        const statement = new BurnStatement(); // WARNING: if this is called directly in the console,

        // and your strings are less than 64 characters, they will be padded on the right, not the left. should hopefully not be an issue,
        // as this will typically be called simply by the other contract. still though, beware

        statement.CLn = CLn;
        statement.CRn = CRn;
        statement.y = y;
        statement.epoch = epoch;
        statement.u = u;
        statement.sender = sender;

        const burnProof = new BurnProof();
        burnProof.unserialize(proof);

        return this.verify(statement, burnProof);

    }

    verify( statement, proof ){


        const statementHash = utils.hash(ABICoder.encodeParameters([
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'uint256',
            'address',
        ], [
            bn128.serialize(statement.CLn  ),
            bn128.serialize(statement.CRn  ),
            bn128.serialize(statement.y  ),
            statement.epoch,
            statement.sender,
        ])); // stacktoodeep?

        const burnAuxiliaries = new BurnAuxiliaries();
        burnAuxiliaries.y = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(statementHash),
            bn128.serialize(proof.BA),
            bn128.serialize(proof.BS),
        ]));

        burnAuxiliaries.ys[0] = new BN(1).toRed(bn128.q);
        burnAuxiliaries.k = new BN(1).toRed(bn128.q);
        for (let i = 1; i < g_m; i++) {
            burnAuxiliaries.ys[i] = burnAuxiliaries.ys[i - 1].redMul(burnAuxiliaries.y);
            burnAuxiliaries.k = burnAuxiliaries.k.redAdd(burnAuxiliaries.ys[i]);
        }

        burnAuxiliaries.z = utils.hash(ABICoder.encodeParameters([
            'bytes32',
        ], [
            bn128.bytes(burnAuxiliaries.y),
        ]));


        burnAuxiliaries.zs = [burnAuxiliaries.z.redPow( new BN(2) )];
        burnAuxiliaries.zSum = burnAuxiliaries.zs[0].redMul(burnAuxiliaries.z); // trivial sum

        burnAuxiliaries.k = burnAuxiliaries.k.redMul(burnAuxiliaries.z.redSub(burnAuxiliaries.zs[0])).redSub(burnAuxiliaries.zSum.redMul( new BN( Math.pow(2, g_m)).toRed(bn128.q)  ).redSub(burnAuxiliaries.zSum));
        burnAuxiliaries.t = proof.tHat.redSub(burnAuxiliaries.k);
        for (let i = 0; i < g_m; i++) {
            burnAuxiliaries.twoTimesZSquared[i] = burnAuxiliaries.zs[0].redMul( new BN( Math.pow(2, i) ).toRed(bn128.q) );
        }

        burnAuxiliaries.x = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(burnAuxiliaries.z),
            ...proof.tCommits.getVector().map(bn128.serialize),
        ]));

        burnAuxiliaries.tEval = proof.tCommits.getVector()[0].mul( burnAuxiliaries.x).add( proof.tCommits.getVector()[1].mul( burnAuxiliaries.x.redMul(burnAuxiliaries.x) )); // replace with "commit"?

        const sigmaAuxiliaries = new SigmaAuxiliaries();
        sigmaAuxiliaries.A_y = utils.g().mul(proof.s_sk ).add( statement.y.mul( proof.c.redNeg() ));
        sigmaAuxiliaries.A_b = utils.g().mul(proof.s_b).add(statement.CRn.mul(proof.s_sk).add(statement.CLn.mul(proof.c.neg())).mul(burnAuxiliaries.zs[0]));
        sigmaAuxiliaries.A_t = utils.g().mul(burnAuxiliaries.t).add(burnAuxiliaries.tEval.neg()).mul(proof.c).add(utils.h().mul(proof.s_tau)).add(utils.g().mul(proof.s_b.neg()));
        sigmaAuxiliaries.gEpoch = utils.gEpoch( statement.epoch );

        sigmaAuxiliaries.A_u = sigmaAuxiliaries.gEpoch.mul( proof.s_sk).add( statement.u.mul( proof.c.redNeg()));

        sigmaAuxiliaries.c = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(burnAuxiliaries.x),
            bn128.serialize(sigmaAuxiliaries.A_y),
            bn128.serialize(sigmaAuxiliaries.A_b),
            bn128.serialize(sigmaAuxiliaries.A_t),
            bn128.serialize(sigmaAuxiliaries.A_u),
        ]));

        this._commonVerifier.verify(proof, sigmaAuxiliaries, burnAuxiliaries);

        return true;
    }

}

module.exports = new BurnVerifier ();