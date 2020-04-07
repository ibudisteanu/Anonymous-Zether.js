const ABICoder = require('web3-eth-abi');

const utils  = require("./../utils/utils");
const BN = require('bn.js');

const bn128 = require('../utils/bn128.js');
const G1Point0 = utils.G1Point0;

const MAX = 4294967295; // 2^32 - 1 // no sload for constants...!

const ZVerifier = require("./zverifier");
const BurnerVerifier = require("./burnerverifier");
const consts = require("./../consts");

class ZSC{

    constructor( blockchain, address = '0x5d6c4ebf1b789883b58b0d7a7fe937e275212960' ) {

        this._blockchain = blockchain;

        this.address = address;

        //mapping(bytes32 => Utils.G1Point[2]) acc; // main account mapping
        this._acc = {};

        //mapping(bytes32 => Utils.G1Point[2]) pTransfers; // storage for pending transfers
        this._pending = {};

        //mapping(bytes32 => uint256) lastRollOver;
        this._lastRollOver = {};

        this._nonceSet = {};

        this._lastGlobalUpdate = 0;


    }

    async _deleteAccMap(hash){

        delete this._acc[ utils.fromHex( hash ) ];

    }

    //if not found returns G1Point[2] with empty points
    async _getAccMap(hash){

        hash = utils.fromHex( hash );

        if (this._acc[ hash ]) return [...this._acc[ hash ]];
        return [ G1Point0(), G1Point0() ];

    }

    async _setAccMap(hash, value){

        if (!value[0].validate()) throw "Acc0 is invalid";
        if (!value[1].validate()) throw "Acc1 is invalid";

        this._acc[utils.fromHex(hash)] = [...value];

    }

    async _deletePendingMap(hash){

        delete this._pending[ utils.fromHex( hash ) ];

    }

    //if not found returns G1Point[2] with empty points
    async _getPendingMap(hash){

        hash = utils.fromHex( hash );

        if (this._pending[ hash ]) return [...this._pending[ hash ] ];
        return [G1Point0(), G1Point0() ];

    }

    async _setPendingMap(hash, value){

        if (!value[0].validate()) throw "Acc0 is invalid";
        if (!value[1].validate()) throw "Acc1 is invalid";

        this._pending[ utils.fromHex(hash) ] = [...value];

    }

    //if not found, returns 0
    async _getLastRollOverMap(hash){

        let out = this._lastRollOver[ utils.fromHex( hash ) ];

        return out || 0;
    }

    async _setLastRollOverMap(hash, value){
        this._lastRollOver[ utils.fromHex(hash) ] = value;
    }


    _getNonceSetAll(){
        return this._nonceSet;
    }

    _getNonceSet(uHash){
        return this._nonceSet[utils.fromHex(uHash)];
    }

    _setNonceSet(uHash){
        this._nonceSet[utils.fromHex(uHash)] = true;
    }

    _clearNonceSet(){
        this._nonceSet = {};
    }

    _setLastGlobalUpdate(value){
        this._lastGlobalUpdate = value;
    }

    _getLastGlobalUpdate(){
        return this._lastGlobalUpdate;
    }

    _getMinerHash(){
        return consts.MINER_HASH;
    }

    async registered(yHash){

        const acc = await this._getAccMap(yHash);
        const pending = await this._getPendingMap(yHash);

        const scratch = [ acc, pending ];

        return !( scratch[0][0].eq( utils.G1Point0Const ) && scratch[0][1].eq( utils.G1Point0Const ) && scratch[1][0].eq( utils.G1Point0Const ) && scratch[1][1].eq( utils.G1Point0Const ) );
    }

    async register(y, c,  s){

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
        if ( await this.registered(yHash) ) throw "Account already registered!";

        await this._setPendingMap(yHash, [ y, utils.g() ] );

        return {
            challenge,
            yHash,
        }
    }

    async fund( y, bTransfer){

        const yHash = utils.keccak256( utils.encodedPackaged( bn128.serialize(y) ) );
        if ( await this.registered(yHash) === false) throw new Error("Account not yet registered.");

        await this._rollOver( yHash );

        if (  bTransfer > MAX || bTransfer < 0 )throw "Deposit amount out of range."; // uint, so other way not necessary?

        let scratch = await this._getPendingMap(yHash);
        scratch[0] = scratch[0].add( utils.g().mul(bTransfer) );

        await this._setPendingMap( yHash, scratch );

        return true;
    }

    async simulateAccounts(y, epoch) {

        // in this function and others, i have to use public + memory (and hence, a superfluous copy from calldata)
        // only because calldata structs aren't yet supported by solidity. revisit this in the future.

        const size = y.length;

        const accounts = [];

        for (let i=0; i < size; i++){

            const yHash = utils.keccak256( utils.encodedPackaged( bn128.serialize(y[i]) ) );

            accounts[i] = await this._getAccMap(yHash);

            if (await this._getLastRollOverMap(yHash) < epoch) {

                const scratch = await this._getPendingMap(yHash );
                accounts[i][0] = accounts[i][0].add( scratch[0] );
                accounts[i][1] = accounts[i][1].add( scratch[1] );

                if ( !accounts[i][0].validate() ) throw "Error PointSum1";
                if ( !accounts[i][1].validate() ) throw "Error PointSum2";

            }

        }

        return accounts;

    }


    //Transfer is verified
    async transfer(  C, D, y, u, proof, fee = 0){

        if (fee < 0) throw "Fee needs to be positive";
        fee = new BN(fee).toRed(bn128.q);

        let size = y.length;
        if (C.length !== size) throw "Input array length mismatch!";

        const CLn = [], CRn = [];

        for (let i=0; i < size; i++) {

            const yHash = utils.keccak256(utils.encodedPackaged( bn128.serialize(y[i]) ));
            if ( await this.registered(yHash) === false) throw new Error("Account not yet registered.");

            await this._rollOver( yHash);

            let scratch = await this._getPendingMap(yHash);
            const pending = [];
            pending[0] = scratch[0].add( C[i] );
            pending[1] = scratch[1].add( D );

            await this._setPendingMap( yHash, pending ); // credit / debit / neither y's account.

            scratch = await this._getAccMap(yHash);
            CLn[i] = scratch[0].add( C[i] );
            CRn[i] = scratch[1].add( D );

        }

        /**
         * MINER FEE
         */
        if ( fee.gt(0) ) {
            const minerHash = this._getMinerHash();
            await this._rollOver(minerHash);
            const scratch = await this._getPendingMap(minerHash);

            scratch[0] = scratch[0].add( utils.g().mul( fee ) );
            await this._setPendingMap( minerHash, scratch);
        }

        const uHash = utils.keccak256(  utils.encodedPackaged( bn128.serialize(u) ) ); // NO modulo

        if ( this._getNonceSet(uHash) ) throw "Nonce already seen!";
        this._setNonceSet(uHash);

        if ( !ZVerifier.verifyTransfer(CLn, CRn, C, D, y, this._getLastGlobalUpdate(), u, proof, fee) ) throw "Transfer proof verification failed!";

        return [ C, D, y, u, proof ];
    }

    async _rollOver( yHash ){

        const e = this._getEpoch();

        if ( await this._getLastRollOverMap(yHash) < e) {

            const scratch = [ await this._getAccMap(yHash), await this._getPendingMap(yHash) ];

            const out1 = scratch[0][0].add( scratch[1][0] );
            const out2 = scratch[0][1].add( scratch[1][1] );

            await this._setAccMap(yHash, [ out1, out2 ] );
            await this._setPendingMap(yHash, [ utils.G1Point0(), utils.G1Point0() ] );
            await this._setLastRollOverMap(yHash, e);

        }

        if (this._getLastGlobalUpdate() < e){

            this._setLastGlobalUpdate(e);
            await this._clearNonceSet();

        }


    }


    async burn ( y, bTransfer, u, proof, sender){

        const yHash = utils.keccak256(utils.encodedPackaged( bn128.serialize(y) ));
        if ( await this.registered(yHash) === false) throw new Error("Account not yet registered.");

        await this._rollOver( yHash );

        if ( bTransfer < 0 || bTransfer > MAX) throw "Transfer amount out of range";

        let pending = await this._getPendingMap(yHash); // could technically use sload, but... let's not go there.
        pending[0] = pending[0].add( utils.g().mul( new BN(bTransfer).toRed(bn128.q).neg()) );
        await this._setPendingMap(yHash, pending);  // debit y's balance

        const scratch = await this._getAccMap(yHash); // simulate debit of acc---just for use in verification, won't be applied
        scratch[0] = scratch[0].add( utils.g().mul( new BN(bTransfer).toRed(bn128.q).neg()) );

        const uHash = utils.fromHex( utils.keccak256(  utils.encodedPackaged( bn128.serialize(u) ) ) ); // NO modulo

        if ( this._getNonceSet(uHash) ) throw "Nonce already seen!";
         this._setNonceSet(uHash);

        if ( !BurnerVerifier.verifyBurn( scratch[0], scratch[1], y,  this._getLastGlobalUpdate(), u, sender, proof) ) throw "Burn proof verification failed!";

        return true;
    }

    // no "start" parameter for now.
    // CL and CR are "flat", x is a BN.
    readBalance (CL, CR, x, negate = false) {


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
        const Y = y[i].mul( k );

        const c = utils.hash( bn128.representation(K) + bn128.representation(Y).substr(2) );
        const s = k.add( c.redMul( r  ) );

        return {c, s};
    }

    verifyAmountSender(b, i, y, C, D, proof){

        //K_r
        const Kr = bn128.curve.g.mul( proof.s ).add(  D.mul( proof.c.neg() ) );

        //Y_r
        const Yr = y[i].mul( proof.s ).add(  bn128.curve.g.mul( new BN( b )).add( C[i] ).mul( proof.c.neg() ));

        const hash = utils.hash( bn128.representation(Kr) + bn128.representation(Yr).substr(2) );

        if ( !hash.eq(proof.c)) throw "Proof is not matching";

        return true;

    }

    _getEpoch(){
        return this._blockchain.getEpoch()
    }

}


module.exports = ZSC;