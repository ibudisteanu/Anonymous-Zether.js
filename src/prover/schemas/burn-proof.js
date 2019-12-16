const bn128  = require('./../../utils/bn128');
const utils = require('./../../utils/utils');
const { FieldVector, GeneratorVector } = require('./../../prover/algebra.js');

const InnerProductProof= require('./inner-product-proof');

const slice = utils.slice;
const G1Point = utils.G1Point;

class BurnProof {

    constructor() {

    };

    serialize () { // please initialize this before calling this method...
        var result = "0x";
        result += bn128.representation(this.A).slice(2);
        result += bn128.representation(this.S).slice(2);

        result += bn128.representation(this.CLnPrime).slice(2);
        result += bn128.representation(this.CRnPrime).slice(2);

        this.tCommits.getVector().forEach((commit) => {
            result += bn128.representation(commit).slice(2);
        });
        result += bn128.bytes(this.tHat).slice(2);
        result += bn128.bytes(this.tauX).slice(2);
        result += bn128.bytes(this.mu).slice(2);

        result += bn128.bytes(this.c).slice(2);
        result += bn128.bytes(this.s_sk).slice(2);
        result += bn128.bytes(this.s_vDiff).slice(2);
        result += bn128.bytes(this.s_nuDiff).slice(2);

        result += this.ipProof.serialize().slice(2);

        return result;
    }

    unserialize(arr){

        arr = Buffer.from( utils.fromHex(arr), "hex");

        this.A = G1Point(slice(arr, 0), slice(arr, 32));
        this.S = G1Point(slice(arr, 64), slice(arr, 96));

        this.CLnPrime = G1Point(slice(arr, 128), slice(arr, 160));
        this.CRnPrime = G1Point(slice(arr, 192), slice(arr, 224));

        this.tCommits = new FieldVector( [G1Point(slice(arr, 256), slice(arr, 288)), G1Point(slice(arr, 320), slice(arr, 352))] );
        this.tHat = slice(arr, 384);
        this.tauX = slice(arr, 416);
        this.mu = slice(arr, 448);

        this.c = slice(arr, 480);
        this.s_sk = slice(arr, 512);
        this.s_vDiff = slice(arr, 544);
        this.s_nuDiff = slice(arr, 576);

        const ipProof = new InnerProductProof('burner');
        for (let i = 0; i < utils.gBurn_n; i++) {
            ipProof.ls[i] = G1Point(slice(arr, 608 + i * 64), slice(arr, 640 + i * 64));
            ipProof.rs[i] = G1Point(slice(arr, 608 + (utils.gBurn_n + i) * 64), slice(arr, 640 + (utils.gBurn_n + i) * 64));
        }
        ipProof.a = slice(arr, 608 + utils.gBurn_n * 128);
        ipProof.b = slice(arr, 640 + utils.gBurn_n * 128);
        this.ipProof = ipProof;

    }

}

module.exports = BurnProof;