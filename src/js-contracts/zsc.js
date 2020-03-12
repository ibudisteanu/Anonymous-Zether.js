const clone = require('clone');
const ABICoder = require('web3-eth-abi');

const utils  = require("./../utils/utils");
const BN = require('bn.js')
const consts = require('./../consts');

const { FieldVector } = require('./../prover/algebra.js');
const bn128 = require('../utils/bn128.js');
const G1Point = utils.G1Point;
const G1Point0 = utils.G1Point0;
const G1PointArray = utils.G1PointArray;

const BNFieldfromHex = utils.BNFieldfromHex;

const MAX = 4294967295; // 2^32 - 1 // no sload for constants...!

const ZVerifier = require("./zverifier");
const BurnerVerifier = require("./burferverifier");

const EventEmitter = require('events').EventEmitter;

class ZSC{

    constructor() {

        this.address = '0x5d6c4ebf1b789883b58b0d7a7fe937e275212960';

        //mapping(bytes32 => Utils.G1Point[2]) acc; // main account mapping
        this._acc = {};

        //mapping(bytes32 => Utils.G1Point[2]) pTransfers; // storage for pending transfers
        this._pending = {};

        //mapping(bytes32 => uint256) lastRollOver;
        this._lastRollOver = {};

        this._nonceSet = {};

        this.lastGlobalUpdate = 0;

        this.events = new EventEmitter();

    }

    //if not found returns G1Point[2] with empty points
    _getAccMap(hash){

        hash = utils.fromHex( hash );

        if (this._acc[ hash ]) return [...this._acc[ hash ]];
        else return [ G1Point0(), G1Point0() ];

    }

    _setAccMap(hash, value){

        hash = utils.fromHex(hash);

        if (!value[0].validate()) throw "Acc0 is invalid";
        if (!value[1].validate()) throw "Acc1 is invalid";

        this._acc[hash] = [...value];

    }

    //if not found returns G1Point[2] with empty points
    _getPending(hash){

        hash = utils.fromHex( hash );

        if (this._pending[ hash ]) return [...this._pending[ hash ] ];
        else return [G1Point0(), G1Point0() ];

    }

    _setPending(hash, value, index){

        hash = utils.fromHex(hash);

        if (index === undefined) {

            for (let i=0; i < 2; i++)
                if (!value[i].validate() ) throw "value is invalid";

            this._pending[ hash ] = [...value];
        }
        else {

            if ( !value.validate() ) throw "value is invalid";
            this._pending[ hash ][index] = value;
        }
    }

    //if not found, returns 0
    _getLastRollOver(hash){

        let out = this._lastRollOver[ utils.fromHex( hash ) ];
        if (!out) out = 0;

        return out;
    }

    _setLastRollOver(hash, value){
        this._lastRollOver[ utils.fromHex(hash) ] = value;
    }

    registered(yHash){

        const acc = this._getAccMap(yHash);
        const pending = this._getPending(yHash);

        const zero = utils.G1Point0();

        const scratch = [ acc, pending ];

        return !( scratch[0][0].eq(zero) && scratch[0][1].eq(zero) && scratch[1][0].eq(zero) && scratch[1][1].eq(zero) );
    }

    register(y, c,  s){

        const K = utils.g().mul( s ).add(y.mul(c.neg() ));
        if (!K.validate() ) throw "K is invalid";

        const challenge = utils.hash(ABICoder.encodeParameters([
            'address',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            this.address,
            bn128.serialize(y),
            bn128.serialize(K),
        ]));

        if (!challenge.eq( c  ))
            throw new Error('Invalid registration signature!');

        const yHash = utils.keccak256( utils.encodedPackaged( bn128.serialize(y) ) );
        if ( this.registered(yHash) ) throw "Account already registered!";

        this._setPending(yHash, [ y, utils.g() ] );

        return {
            challenge,
            yHash,
        }
    }

    fund({block}, y, bTransfer){

        const yHash = utils.keccak256( utils.encodedPackaged(y) );
        if (!this.registered(yHash)) throw new Error("Account not yet registered.");

        this._rollOver({block}, yHash);

        if (  bTransfer > MAX || bTransfer < 0 )throw "Deposit amount out of range."; // uint, so other way not necessary?

        let scratch = this._getPending(yHash)[0];
        scratch = scratch.add( utils.g().mul(bTransfer) );
        if ( !scratch.validate() ) throw "Scratch is invalid";

        this._setPending( yHash, scratch, 0  );

        //require(coin.transferFrom(msg.sender, address(this), bTransfer), "Transfer from sender failed.");

    }

    simulateAccounts(y, epoch) {

        // in this function and others, i have to use public + memory (and hence, a superfluous copy from calldata)
        // only because calldata structs aren't yet supported by solidity. revisit this in the future.

        const size = y.length;

        const accounts = [];

        for (let i=0; i < size; i++){

            const yHash = utils.keccak256( utils.encodedPackaged(y[i]) );

            accounts[i] = this._getAccMap(yHash);

            if (this._getLastRollOver(yHash) < epoch) {

                const scratch = this._getPending(yHash );
                accounts[i][0] = accounts[i][0].add( scratch[0] );
                accounts[i][1] = accounts[i][1].add( scratch[1] );

                if ( !accounts[i][0].validate() ) throw "Error PointSum1";
                if ( !accounts[i][1].validate() ) throw "Error PointSum2";

            }

        }

        return accounts;

    }


    //Transfer is verified
    transfer( {block}, C, D, y, u, proof){

        let size = y.length;
        if (C.length !== size) throw "Input array length mismatch!";

        C = C.map( it => bn128.unserialize(it) );
        D = bn128.unserialize(D);
        y = y.map( it => bn128.unserialize(it) );
        u = bn128.unserialize(u);

        const CLn = [], CRn = [];

        for (let i=0; i < size; i++) {

            const yHash = utils.keccak256(utils.encodedPackaged( bn128.serialize(y[i]) ));
            if (!this.registered(yHash)) throw new Error("Account not yet registered.");

            this._rollOver({block}, yHash);

            let scratch = this._getPending(yHash);
            const pending = [];
            pending[0] = scratch[0].add( C[i] );
            pending[1] = scratch[1].add( D );

            this._setPending( yHash, pending ); // credit / debit / neither y's account.

            scratch = this._getAccMap(yHash);
            CLn[i] = scratch[0].add( C[i] );
            CRn[i] = scratch[1].add( D );

        }

        /**
         * MINER FEE
         */

        // this._rollOver({block}, consts.MINER_HASH);
        // const scratch = this._getPending( consts.MINER_HASH );
        //
        // const out1 = utils.g().mul( consts.FEE_BN );
        //
        // scratch[0] = scratch[0].add( out1 );
        // this._setPending( consts.MINER_HASH, scratch );

        const uHash = utils.keccak256(  utils.encodedPackaged( bn128.serialize(u) ) ); // NO modulo

        if (this._nonceSet[ utils.fromHex( uHash ) ]) throw "Nonce already seen!";

        this._nonceSet[ utils.fromHex( uHash ) ] = true;

        if ( !ZVerifier.verifyTransfer(CLn, CRn, C, D, y, this.lastGlobalUpdate, u, proof) ) throw "Transfer proof verification failed!";

        return [ C, D, y, u, proof ];
    }

    _rollOver({block}, yHash ){

        let e = consts.getEpoch();
        console.log("rollOver epoch", e);

        if (this._getLastRollOver(yHash) < e) {

            const scratch = [ this._getAccMap(yHash), this._getPending(yHash) ];

            const out1 = scratch[0][0].add( scratch[1][0] );
            const out2 = scratch[0][1].add( scratch[1][1] );

            this._setAccMap(yHash, [ out1, out2 ] );
            this._setPending(yHash, [ utils.G1Point0(), utils.G1Point0() ] );
            this._setLastRollOver(yHash, e);

        }

        if (this.lastGlobalUpdate < e){

            console.log("this.lastGlobalUpdate = e", this.lastGlobalUpdate, "=> ", e);
            this.lastGlobalUpdate = e;
            this._nonceSet = {};

        }


    }


    burn ({block}, y, bTransfer, u, proof, sender){

        const yHash = utils.keccak256(utils.encodedPackaged( bn128.serialize(y) ));
        if (!this.registered(yHash)) throw new Error("Account not yet registered.");

        this._rollOver({block}, yHash);

        if ( bTransfer < 0 || bTransfer > MAX) throw "Transfer amount out of range";

        let pending = this._getPending(yHash); // could technically use sload, but... let's not go there.
        pending[0] = pending[0].add( utils.g().mul( new BN(bTransfer).toRed(bn128.q).neg()) );
        this._setPending(yHash, pending);  // debit y's balance

        const scratch = this._getAccMap(yHash); // simulate debit of acc---just for use in verification, won't be applied
        scratch[0] = scratch[0].add( utils.g().mul( new BN(bTransfer).toRed(bn128.q).neg()) );

        const uHash = utils.keccak256(  utils.encodedPackaged( bn128.serialize(u) ) ); // NO modulo

        if (this._nonceSet[ utils.fromHex( uHash ) ]) throw "Nonce already seen!";

        this._nonceSet[ utils.fromHex( uHash ) ] = true;

        if ( !BurnerVerifier.verifyBurn( scratch[0], scratch[1], y,  this.lastGlobalUpdate, u, sender, proof) ) throw "Burn proof verification failed!";

        //require(coin.transfer(msg.sender, bTransfer), "This shouldn't fail... Something went severely wrong.");

        return true;
    }

    // no "start" parameter for now.
    // CL and CR are "flat", x is a BN.
    readBalance (CL, CR, x, negate = false) {

        CL = bn128.unserialize(CL);
        CR = bn128.unserialize(CR);

        if (negate){
            CL = CL.neg();
            CR = CR.neg();
        }

        const gB = CL.add(CR.mul(x.redNeg()));

        let accumulator = bn128.zero;
        for (let  i = 0; i < bn128.B_MAX; i++) {
            if (accumulator.eq(gB))
                return i;

            accumulator = accumulator.add(bn128.curve.g);
        }

        return 0;
    }

    proveAmountSender( y, i, r){

        const k = bn128.randomScalar();

        const K = bn128.curve.g.mul( k );
        const Y = bn128.unserialize( y[i] ).mul( k );

        const c = utils.hash( bn128.representation(K) + bn128.representation(Y).substr(2) );
        const s = k.add( c.redMul( BNFieldfromHex(r)  ) );

        return {c, s};
    }

    verifyAmountSender(b, i, y, C, D, proof){

        //K_r
        const Kr = bn128.curve.g.mul( proof.s ).add(  bn128.unserialize(D).mul( proof.c.neg() ) );

        //Y_r
        const Yr = bn128.unserialize( y[i] ).mul( proof.s ).add(  bn128.curve.g.mul( new BN( b )).add( bn128.unserialize(C[i]) ).mul( proof.c.neg() ));

        const hash = utils.hash( bn128.representation(Kr) + bn128.representation(Yr).substr(2) );

        if ( !hash.eq(proof.c)) throw "Proof is not matching";

        return true;

    }

}


module.exports = new ZSC();



