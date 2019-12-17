const clone = require('clone');

const utils  = require("./../utils/utils");
const BN = require('bn.js')
const consts = require('./../consts');

const { FieldVector } = require('./../prover/algebra.js');
const bn128 = require('../utils/bn128.js');
const G1Point = utils.G1Point;
const G1Point0 = utils.G1Point0;
const BNFieldfromHex = utils.BNFieldfromHex;

const MAX = 4294967295; // 2^32 - 1 // no sload for constants...!

const ZVerifier = require("./zverifier");
const BurnerVerifier = require("./burferverifier");

const EventEmitter = require('events').EventEmitter;

class ZSC{

    constructor() {

        //mapping(bytes32 => bytes32[2][2]) acc; // main account mapping
        this._acc = {};

        //mapping(bytes32 => bytes32[2][2]) pTransfers; // storage for pending transfers
        this._pTransfers = {};

        //mapping(bytes32 => uint256) lastRollOver;
        this._lastRollOver = {};

        this._nonceSet = {};

        this.lastGlobalUpdate = 0;

        this.bTotal = 0;

        this.events = new EventEmitter();

    }

    //if not found, returns bytes32[2][2] with empty elements
    _getAccMap(hash){

        hash = utils.fromHex( hash );
        let out = [];
        if (this._acc[ hash ]) out = clone( this._acc[ hash ] );

        for (let i=0; i < 2; i++){
            if (!out[i]) out[i] = new Array (2);
            for (let j=0; j < 2; j++)
                if (!out[i][j]) out[i][j] = '0x0000000000000000000000000000000000000000000000000000000000000000';
        }

        return out;
    }

    _setAccMap(hash, value){
        this._acc[ utils.fromHex(hash) ] = clone(value);
    }

    //if not found returns bytes32[2][2] with empty bytes
    _getpTransfers(hash){

        hash = utils.fromHex( hash );

        let out = [];
        if (this._pTransfers[ hash ]) out = clone( this._pTransfers[ hash ] );

        for (let i=0; i < 2; i++){
            if (!out[i]) out[i] = new Array (2);
            for (let j=0; j < 2; j++)
                if (!out[i][j]) out[i][j] = '0x0000000000000000000000000000000000000000000000000000000000000000';
        }

        return out;
    }

    _setpTransfers(hash, value, index){

        hash = utils.fromHex(hash);

        if (index === undefined) this._pTransfers[ hash ] = clone(value);
        else {
            if (!this._pTransfers[ hash ]) this._pTransfers[ hash ] = [];
            this._pTransfers[ hash ][index] = clone(value);
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

    fund({block}, y, bTransfer){

        const yHash = utils.keccak256( utils.encodedPackaged(y) );
        this._rollOver({block}, yHash);

        // registration check here would be redundant, as any `transferFrom` the 0 address will necessarily fail. save an sload
        if (  bTransfer > MAX || bTransfer < 0 )throw "Deposit amount out of range."; // uint, so other way not necessary?
        if (  bTransfer + this.bTotal > MAX )throw "Fund pushes contract past maximum value.";

        // if pTransfers[yHash] == [0, 0, 0, 0] then an add and a write will be equivalent...
        let scratch = this._getpTransfers(yHash)[0];
        const PScratch = G1Point(  scratch[0], scratch[1] );

        const PInput = G1Point(  "0x077da99d806abd13c9f15ece5398525119d11e11e9836b2ee7d23f6159ad87d4",  "0x01485efa927f2ad41bff567eec88f32fb0a0f706588b4e41a8d587d008b7f875"  );

        const POut1 = PInput.mul( new BN( bTransfer.toString(16), 16 ) );
        if ( !POut1.validate() ) throw "Invalid POut1";

        const POut2 = POut1.add( PScratch );
        if ( !POut2.validate() ) throw "Invalid POut2";

        scratch = bn128.serialize( POut2 );

        this._setpTransfers( yHash, scratch, 0  );

        //require(coin.transferFrom(msg.sender, address(this), bTransfer), "Transfer from sender failed.");

        this.bTotal += bTransfer;

    }

    simulateAccounts(y, epoch) {

        // all of this could be assembled locally by querying `acc` and `pTransfers` (and `lastRollOver`) and assembling things by hand
        // turns out this is extremely _slow_ though, because of the ~ 4 * N queries which must be made. turns out it's much faster
        // to simply move the entire process into a contract method, and in fact this allows us to make the above 3 private

        const size = y.length;

        // accounts = new bytes32[2][2][](size);
        const accounts = [];

        for (let i=0; i < size; i++){

            const yHash = utils.keccak256( utils.encodedPackaged(y[i]) );
            accounts[i] = this._getAccMap(yHash);

            if (this._getLastRollOver(yHash) < epoch) {

                const scratch = this._getpTransfers(yHash );

                //See explanation https://github.com/jpmorganchase/anonymous-zether/issues/17#issuecomment-565848230
                {
                    const Point1 = bn128.unserialize( scratch[0] );
                    const Point2 = bn128.unserialize( accounts[i][0] );

                    const PointSum = Point1.add(Point2);

                    if ( !PointSum.validate() ) throw "Error PointSum1";

                    accounts[i][0] = bn128.serialize( PointSum );

                }

                {
                    const Point1 = bn128.unserialize( scratch[1] );
                    const Point2 = bn128.unserialize( accounts[i][1] );

                    const PointSum = Point1.add(Point2);

                    if ( !PointSum.validate() ) throw "Error PointSum2";

                    accounts[i][1] = bn128.serialize( PointSum );

                }

            }

        }


        return accounts;

    }


    //Transfer is verified
    transfer( {block}, C, D, y, u, proof){

        let size = y.length;


        const CLn = [], CRn = [];
        for (let i=0; i <2; i++) {
            CLn[i] = new Array(size);
            CRn[i] = new Array(size);
        }

        if (C.length !== size) throw "Input array length mismatch!";

        let result = 1;

        for (let i=0; i < y.length; i++) {

            const yHash = utils.keccak256(utils.encodedPackaged(y[i]));

            this._rollOver({block}, yHash);

            let scratch = this._getpTransfers(yHash);


            {
                const diff = '0x' + BNFieldfromHex("30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47").redSub( BNFieldfromHex( C[i][1] ) ).toString(16); //for the test, it should be 0xaa3d1123200d8ed71d14a4d3bb4b6efac36bc4a9a8a5d00dd4b273f4a8882ce

                const P1 = G1Point(  scratch[0][0] ,  scratch[0][1]  );
                const P2 = G1Point(  C[i][0] ,  diff  );

                const sum = P1.add(P2);

                scratch[0] = bn128.serialize(sum);

                result = result & (sum.validate());

                const diff_2 = '0x' + BNFieldfromHex( "30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47").redSub( BNFieldfromHex( D[1] ) ).toString(16); //for the test, it should be 0x61dea82c6dd354ccca55870e4883135525f2d55b1adb5c86ce92ba06512f953

                const P3 = G1Point(  scratch[1][0] ,  scratch[1][1]   );
                const P4 = G1Point(  D[0] ,  diff_2  );

                const sum2 = P3.add(P4);

                scratch[1] = bn128.serialize(sum2);

                result = result & (sum2.validate());

            }



            this._setpTransfers( yHash, scratch ); // credit / debit / neither y's account.

            scratch = this._getAccMap(yHash);

            {

                const diff = '0x' + BNFieldfromHex( "30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47").redSub( BNFieldfromHex( C[i][1] )).toString(16); //for the test, it should be 0xaa3d1123200d8ed71d14a4d3bb4b6efac36bc4a9a8a5d00dd4b273f4a8882ce

                const P1 = G1Point(  scratch[0][0] ,  scratch[0][1]  );
                const P2 = G1Point(  C[i][0] ,  diff  );

                const sum = P1.add(P2);

                CLn[i] = bn128.serialize(sum);

                result = result & (sum.validate());

                const diff_2 = '0x' + BNFieldfromHex( "30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47").redSub( BNFieldfromHex( D[1] ) ).toString(16); //for the test, it should be 0x61dea82c6dd354ccca55870e4883135525f2d55b1adb5c86ce92ba06512f953

                const P3 = G1Point(  scratch[1][0] ,  scratch[1][1]   );
                const P4 = G1Point(  D[0] ,  diff_2  );

                const sum2 = P3.add(P4);

                CRn[i] = bn128.serialize(sum2);

                result = result & (sum2.validate());


            }

            if ( !result ) throw "Elliptic curve operations failure. Bad points?";

        }


        const uHash = utils.keccak256(  utils.encodedPackaged( u ) ); // NO modulo

        if (this._nonceSet[ utils.fromHex( uHash ) ]) throw "Nonce already seen!";

        if ( !ZVerifier.verifyTransfer(CLn, CRn, C, D, y, this.lastGlobalUpdate, u, proof) ) throw "Transfer proof verification failed!";

        this._nonceSet[ utils.fromHex( uHash ) ] = true;

        return [ C, D, y, u, proof ];
    }



    // function _rollOver(bytes32 yHash) internal {
    _rollOver({block}, yHash ){

        let e = Math.floor( block.timestamp / consts.BLOCK_TIME_OUT / consts.EPOCH_LENGTH);
        console.log("rollOver epoch", e);

        if (this._getLastRollOver(yHash) < e) {

            const scratch = [ this._getAccMap(yHash), this._getpTransfers(yHash) ];

            //see explanation https://github.com/jpmorganchase/anonymous-zether/issues/17#issuecomment-565848230
            {
                const P1 = G1Point( scratch[0][0][0], scratch[0][0][1] );
                const P2 = G1Point( scratch[1][0][0], scratch[1][0][1] );

                const Sum = P1.add(P2);

                if ( !Sum.validate() ) throw "Sum is invalid";

                scratch[0][0] = bn128.serialize( Sum );

            }

            {
                const P1 = G1Point( scratch[0][1][0], scratch[0][1][1] );
                const P2 = G1Point( scratch[1][1][0], scratch[1][1][1] );

                const Sum = P1.add(P2);

                if ( !Sum.validate() ) throw "Sum is invalid";

                scratch[0][1] = bn128.serialize( Sum );

            }

            this._setAccMap(yHash, scratch[0] );
            this._setpTransfers(yHash, [ bn128.serialize(utils.G1Point0()), bn128.serialize(utils.G1Point0() ) ] );
            this._setLastRollOver(yHash, e);

        }

        if (this.lastGlobalUpdate < e){

            console.log("this.lastGlobalUpdate = e", this.lastGlobalUpdate, "=> ", e);
            this.lastGlobalUpdate = e;
            this._nonceSet = {};

        }


    }


    burn ({block}, y, bTransfer, u, proof, sender){

        const yHash = utils.keccak256(utils.encodedPackaged( y ));
        this._rollOver({block}, yHash);

        if ( 0 > bTransfer || bTransfer > MAX) throw "Transfer amount out of range";


        let scratch = this._getpTransfers(yHash); // could technically use sload, but... let's not go there.

        {

            const PScratch = G1Point(  scratch[0][0], scratch[0][1] );
            const PInput = G1Point(  "0x077da99d806abd13c9f15ece5398525119d11e11e9836b2ee7d23f6159ad87d4",  "0x01485efa927f2ad41bff567eec88f32fb0a0f706588b4e41a8d587d008b7f875"  );
            const Sub = BNFieldfromHex("0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001").redSub( new BN(bTransfer).toRed(bn128.q) );

            const out1 = PInput.mul(Sub);
            const out2 = PScratch.add( out1 ); // scratch[0] = acc[yHash][0] * g ^ -b, scratch[1] doesn't change

            if (!out1.validate() || !out2.validate()) throw "invalid points";

            scratch[0] = bn128.serialize(out2);

        }

        this._setpTransfers(yHash, scratch);  // debit y's balance

        scratch = this._getAccMap(yHash); // simulate debit of acc---just for use in verification, won't be applied

        {
            const PScratch = G1Point(  scratch[0][0], scratch[0][1] );
            const PInput = G1Point(  "0x077da99d806abd13c9f15ece5398525119d11e11e9836b2ee7d23f6159ad87d4",  "0x01485efa927f2ad41bff567eec88f32fb0a0f706588b4e41a8d587d008b7f875"  );
            const Sub = BNFieldfromHex("0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001").redSub( new BN(bTransfer).toRed(bn128.q) );

            const out1 = PInput.mul(Sub);
            const out2 = PScratch.add( out1 ); // scratch[0] = acc[yHash][0] * g ^ -b, scratch[1] doesn't change

            if (!out1.validate() || !out2.validate()) throw "invalid points";

            scratch[0] = bn128.serialize(out2);
        }

        const uHash = utils.keccak256(  utils.encodedPackaged( u ) ); // NO modulo

        if (this._nonceSet[ utils.fromHex( uHash ) ]) throw "Nonce already seen!";

        if ( !BurnerVerifier.verifyBurn(scratch[0], scratch[1], y, bTransfer, this.lastGlobalUpdate, u, sender, proof) ) throw "Burn proof verification failed!";

        //require(coin.transfer(msg.sender, bTransfer), "This shouldn't fail... Something went severely wrong.");

        this._nonceSet[ utils.fromHex( uHash ) ] = true;

        return true;
    }


}


module.exports = new ZSC();



