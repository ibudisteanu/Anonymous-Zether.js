const bn128 = require("./../utils/bn128");
const utils = require('./../utils/utils');
const ABICoder = require('web3-eth-abi');
const { FieldVector, GeneratorVector, AdvancedMath } = require('./../prover/algebra.js');

const G1Point = utils.G1Point;
const G1Point0 = utils.G1Point0;
const BNFieldfromHex = utils.BNFieldfromHex;

const BN = require('bn.js');

const BurnStatement = require('./../prover/schemas/burn-statement');
const BurnProof = require('./../prover/schemas/burn-proof');
const BurnAuxiliaries = require('./../prover/schemas/burn-auxiliaries');
const SigmaAuxiliaries = require('./../prover/schemas/sigma-auxiliaries');

const CommonVerifier = require('./common-verifiers');

const FieldParams = require('./field-params');

const g_n = 5;
const g_m = 32;

class BurnVerifier{

    constructor(){
        this.g = FieldParams.g;
        this.h = FieldParams.h;

        this.gs = FieldParams.gs.slice(0, g_m);
        this.hs = FieldParams.hs.slice(0, g_m);

        this._commonVerifier = new CommonVerifier( 'burner', this.g, this.h, this.gs, this.hs, g_m, g_n);

    }

    verifyBurn(CLn, CRn, y, bTransfer, epoch, u, sender, proof){

        // CLn = [
        //     "0x14b47652ee068b8c898b14cf3aa5c5b33dab284e4ef8aecdb8bfffcc93c9d2f0",
        //     "0x05f10accf64b9cb382563097b8805abe504d26c04701d99d00b8ed888df81f24"
        // ];
        // CRn = [
        //     "0x1b7721f698852abd50a3761fd5cae960df1f78d65f8cf9655a71ab6c0911b67c",
        //     "0x0d24232b82330d9dbdffe458c3ade576f55af32aab92b67dd5a3b8a1d9407543"
        // ];
        // y = [
        //     "0x300948553ca0a1fdf8ca2ef2d0845d345e6aeb57da1e0ade636ac26aa39a9290",
        //     "0x305d63c5d3581440bef767a68097f08214b1c3aafb6cebd5ba571f54f30946d4"
        // ];
        // bTransfer = 10;
        // epoch = 262745;
        // u = [
        //     "0x2f40f8180f80f0ef95de55cb7477878e7ff5e5a2a224525518814ab17a6ebb0f",
        //     "0x2510171729ed1fa0d00d63474e45cbf03303af5ad1ec054b6f00b6a9ea35e7d1"
        // ];
        // sender = "0x620CB390Cd936a8E6de0270ed3254a0779475b4C";
        // proof = "0x16415f76c49525276d36db0c4c1a2a51cc1c83d9cbc8668573f779f345d12c492fccf3b394ecf7daeb3b89e5b1a9fa46f194fd18332fca580cb651003444f149249adcc1baddbfc5401d53f3452fb954962be87db83e030940a87cef5dd156a80a001b9c9095b7529df91b58e4293f9d1d84a6f7f1b6ccdcc185f6f2e511896026901f5d7687c4bf129e42ece911e85cb86bb4739cb8b426c555a716c8fa937e2d5ada9e8a0699958b7055e39a74f54e860336d6b2df606de0ae4bf1f7ea92cb1710bcbd23e3bf296a504cdb92aa7122261761347e3b3264d5e39c0fbdb369e326c2cccf3c01ebd7cc5952aa88cc6480b0609738c6f849a75e991918eccd6df02a0338a981c37bbdd430a1c6fce93ab1deb99b2945f0897bc1f670f4e635f84a23b3edc90a0de34462194dbf7dd88ba208af8c54aebb92f25b7e0fadd48c1c8e25f09668fab41e0f83b84e12e99d78d6e01be830dbdfad3d182e107c12a5aeee1cba6c61c854d148857ba685df4986ddce005870548d59193a555b167684be9118d1e5ba1bd904d7e651415c8c896bddb0923b5a2aa7d505fe49e4f8cd2d39d029f408ea7e886bda1a851bddac2bb5a16b0d2464ad1bef7e82c931edf32ca61e25ba0aab1e54c629c7a31cd31fc4ba3ed5305fd4b1c0d944d5847eda510b0d992e2a0f8570948074ef8a32e51f4fdbd2584faee07ccdeef37cdad10be988fc472512789693fcc736eca417d837483377dd0c2a5189c99090e0fa5a6df6c784b10c1c03eb0e891c0dc0a8a2f044e57872fcd2da6d840816d7be2af0e34dfad87602b51759e858ad1cd8ef288e513fd60a9ea2a24a30b5bb692c32ee115eef334016aadc555c5554d8b8b2613445bffcc3f38fa1f0e76d0f1f7c0aad24ac7e49a02a7e59ff308bfb0b7fd19114e0db39346e72a464b232fadafc740372c19bcbc8";

        const statement = new BurnStatement(); // WARNING: if this is called directly in the console,

        // and your strings are less than 64 characters, they will be padded on the right, not the left. should hopefully not be an issue,
        // as this will typically be called simply by the other contract. still though, beware

        statement.CLn = G1Point( CLn[0], CLn[1] );
        statement.CRn = G1Point( CRn[0], CRn[1] );
        statement.y = G1Point( y[0], y[1] );
        statement.bTransfer = bTransfer;
        statement.epoch = epoch;
        statement.u = G1Point( u[0], u[1] );
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
            'uint256',
            'address',
        ], [
            bn128.serialize(statement.CLn  ),
            bn128.serialize(statement.CRn  ),
            bn128.serialize(statement.y  ),
            statement.bTransfer,
            statement.epoch,
            statement.sender,
        ])); // stacktoodeep?

        const burnAuxiliaries = new BurnAuxiliaries();
        burnAuxiliaries.y = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(statementHash),
            bn128.serialize(proof.A),
            bn128.serialize(proof.S),
            bn128.serialize(proof.CLnPrime),
            bn128.serialize(proof.CRnPrime),
        ]));
        burnAuxiliaries.ys = AdvancedMath.powers(burnAuxiliaries.y, utils.gBurn_m);
        burnAuxiliaries.z = utils.hash(ABICoder.encodeParameters([
            'bytes32',
        ], [
            bn128.bytes(burnAuxiliaries.y),
        ]));


        burnAuxiliaries.zs = [burnAuxiliaries.z.redPow( new BN(2) )];
        burnAuxiliaries.zSum = burnAuxiliaries.zs[0].redMul(burnAuxiliaries.z); // trivial sum

        burnAuxiliaries.k = new FieldVector( burnAuxiliaries.ys ).sum().redMul(burnAuxiliaries.z.redSub(burnAuxiliaries.zs[0])).redSub(burnAuxiliaries.zSum.redMul( new BN( Math.pow(2, utils.gBurn_m) ).toRed(bn128.q) ).redSub(burnAuxiliaries.zSum));
        burnAuxiliaries.t = BNFieldfromHex( proof.tHat ).redSub(burnAuxiliaries.k);
        for (let i = 0; i < utils.gBurn_m; i++) {
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
        sigmaAuxiliaries.A_y = this.g.mul( BNFieldfromHex(proof.s_sk) ).add( statement.y.mul( BNFieldfromHex(proof.c).redNeg() ));
        sigmaAuxiliaries.gEpoch = utils.gEpoch( statement.epoch );

        sigmaAuxiliaries.A_u = sigmaAuxiliaries.gEpoch.mul( BNFieldfromHex(proof.s_sk)).add( statement.u.mul( BNFieldfromHex(proof.c).redNeg()));
        sigmaAuxiliaries.c_commit = statement.CRn.add( proof.CRnPrime ).mul( BNFieldfromHex(proof.s_sk) ).add( statement.CLn.add( proof.CLnPrime ).mul( BNFieldfromHex(proof.c).redNeg())).mul( burnAuxiliaries.zs[0] );

        sigmaAuxiliaries.A_t = this.g.mul(  burnAuxiliaries.t ).add( this.h.mul( BNFieldfromHex(proof.tauX) ) ).add( burnAuxiliaries.tEval.neg() ).mul( BNFieldfromHex(proof.c) ).add( sigmaAuxiliaries.c_commit);
        sigmaAuxiliaries.A_CLn = this.g.mul( BNFieldfromHex(proof.s_vDiff) ).add( statement.CRn.mul( BNFieldfromHex(proof.s_sk) ).add( statement.CLn.mul( BNFieldfromHex(proof.c).redNeg())));
        sigmaAuxiliaries.A_CLnPrime = this.h.mul( BNFieldfromHex(proof.s_nuDiff) ).add( proof.CRnPrime.mul( BNFieldfromHex(proof.s_sk) )).add(  proof.CLnPrime.mul( BNFieldfromHex(proof.c).redNeg()));

        sigmaAuxiliaries.c = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(burnAuxiliaries.x),
            bn128.serialize(sigmaAuxiliaries.A_y),
            bn128.serialize(sigmaAuxiliaries.A_u),
            bn128.serialize(sigmaAuxiliaries.A_t),
            bn128.serialize(sigmaAuxiliaries.A_CLn),
            bn128.serialize(sigmaAuxiliaries.A_CLnPrime),
        ]));

        console.log('-------------');
        console.log( 'epoch', statement.epoch );

        this._commonVerifier.verify(proof, sigmaAuxiliaries, burnAuxiliaries);

        return true;
    }

}

module.exports = new BurnVerifier ();