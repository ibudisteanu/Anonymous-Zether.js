const utils = require('./../utils/utils');

const g_m = Math.max( utils.g_m, utils.gBurn_m);

class FieldParams{

    constructor(){
        //VERIFIED, IT WORKS PERFECTLY
        this.g = this.mapInto1(  Buffer.from("G","ascii").toString("hex")  );
        this.h = this.mapInto1( Buffer.from("V","ascii").toString("hex")  );

        this.gs = [];
        this.hs = [];

        for (let i=0; i < g_m; i++) {

            let str = i.toString(16);


            this.gs.push(this.mapInto2( Buffer.from("G","ascii").toString("hex"),  utils.fixHexString(str, 32 ) ) );
            this.hs.push(this.mapInto2( Buffer.from("H","ascii").toString("hex"), utils.fixHexString(str, 32 ) ) );
        }
    }

    mapInto1(input) {
        //return this.mapIntoSeed( new BN(  utils.keccak256( utils.encodedPackaged( [ input ] )   ).slice(2), 16) .toRed(bn128.p) ); //my implementation
        return utils.mapInto( utils.keccak256( utils.encodedPackaged( [ input ] ) ));
    }

    mapInto2(input, i) {
        //return this.mapIntoSeed( new BN( utils.keccak256( utils.encodedPackaged( [ input, i ] ) ).slice(2) , 16).toRed(bn128.p) ); //my implementation
        return utils.mapInto( utils.keccak256( utils.encodedPackaged( [ input, i ] ) ));
    }

}

module.exports = new FieldParams();