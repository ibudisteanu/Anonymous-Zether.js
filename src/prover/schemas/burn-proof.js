const bn128  = require('./../../utils/bn128');
const utils = require('./../../utils/utils');
const { FieldVector, GeneratorVector } = require('./../../prover/algebra.js');

const InnerProductProof= require('./inner-product-proof');

const slice = utils.slice;
const G1Point = utils.G1Point;
const BNFieldfromHex = utils.BNFieldfromHex;

class BurnProof {

    constructor() {
        this.BA = null;
        this.BS = null;
        this.tCommits = [];
        this.tHat = null;
        this.mu = null;
        this.c = null;
        this.s_sk = null;
        this.s_b = null;
        this.s_tau = null;

        this.ipProof = null;

    };

    serialize () { // please initialize this before calling this method...
        var result = "0x";
        result += bn128.representation(this.BA).slice(2);
        result += bn128.representation(this.BS).slice(2);

        this.tCommits.getVector().forEach((commit) => {
            result += bn128.representation(commit).slice(2);
        });
        result += bn128.bytes(this.tHat).slice(2);
        result += bn128.bytes(this.mu).slice(2);

        result += bn128.bytes(this.c).slice(2);
        result += bn128.bytes(this.s_sk).slice(2);
        result += bn128.bytes(this.s_b).slice(2);
        result += bn128.bytes(this.s_tau).slice(2);

        result += this.ipProof.serialize().slice(2);

        return result;
    }

    unserialize(arr){

        arr = Buffer.from( utils.bufferFromHex(arr), "hex");

        this.BA = G1Point(slice(arr, 0), slice(arr, 32));
        this.BS = G1Point(slice(arr, 64), slice(arr, 96));

        this.tCommits = new FieldVector( [G1Point(slice(arr, 128), slice(arr, 160)), G1Point(slice(arr, 192), slice(arr, 224))] );
        this.tHat = BNFieldfromHex(slice(arr, 256));
        this.mu = BNFieldfromHex(slice(arr, 288));

        this.c = BNFieldfromHex( slice(arr, 320) );
        this.s_sk = BNFieldfromHex( slice(arr, 352) );
        this.s_b = BNFieldfromHex( slice(arr, 384) );
        this.s_tau = BNFieldfromHex( slice(arr, 416) );

        const ipProof = new InnerProductProof('burner');
        for (let i = 0; i < utils.gBurn_n; i++) {
            ipProof.ls[i] = G1Point(slice(arr, 448 + i * 64), slice(arr, 480 + i * 64));
            ipProof.rs[i] = G1Point(slice(arr, 448 + (utils.gBurn_n + i) * 64), slice(arr, 480 + (utils.gBurn_n + i) * 64));
        }
        ipProof.a = BNFieldfromHex( slice(arr, 448 + utils.gBurn_n * 128) );
        ipProof.b = BNFieldfromHex( slice(arr, 480 + utils.gBurn_n * 128) );
        this.ipProof = ipProof;

    }

}

module.exports = BurnProof;