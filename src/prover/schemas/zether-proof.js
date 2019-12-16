const bn128 = require("./../../utils/bn128");
const utils = require('./../../utils/utils');

const InnerProductProof= require('./inner-product-proof');

const slice = utils.slice;
const G1Point = utils.G1Point;

class ZetherProof {

    constructor() {

        this.A = null;
        this.S = null;
        this.P = null;
        this.Q = null;
        this.U = null;
        this.V = null;
        this.X = null;
        this.Y = null;

        this.CLnG = [];
        this.CRnG = [];
        this.C_0G = [];
        this.y_0G = [];
        this.C_XG = [];
        this.y_XG = [];
        this.DG = [];
        this.gG = [];

        this.f = [];
        this.z_P = null;
        this.z_U = null;
        this.z_X = null;

        this.CPrime = null;
        this.DPrime = null;
        this.CLnPrime = null;
        this.CRnPrime = null;

        this.tCommits = new Array(2);
        this.tHat = null;
        this.tauX = null;
        this.mu = null;

        this.c = null;
        this.s_sk = null;
        this.s_r = null;
        this.s_vTransfer = null;
        this.s_vDiff = null;
        this.s_nuTransfer = null;
        this.s_nuDiff = null;

        this.ipProof = new InnerProductProof('verifier');

    };

    serialize () { // please initialize this before calling this method...
        var result = "0x";
        result += bn128.representation(this.A).slice(2);
        result += bn128.representation(this.S).slice(2);
        result += bn128.representation(this.P).slice(2);
        result += bn128.representation(this.Q).slice(2);
        result += bn128.representation(this.U).slice(2);
        result += bn128.representation(this.V).slice(2);
        result += bn128.representation(this.X).slice(2);
        result += bn128.representation(this.Y).slice(2);

        this.CLnG.map(CLnG_i => result += bn128.representation(CLnG_i).slice(2) );
        this.CRnG.map(CRnG_i => result += bn128.representation(CRnG_i).slice(2) );
        this.C_0G.map(C_0G_i => result += bn128.representation(C_0G_i).slice(2) );
        this.y_0G.map(y_0G_i => result += bn128.representation(y_0G_i).slice(2) );
        this.C_XG.map(C_XG_i => result += bn128.representation(C_XG_i).slice(2) );
        this.y_XG.map(y_XG_i => result += bn128.representation(y_XG_i).slice(2) );
        this.DG.map(DG_i => result += bn128.representation(DG_i).slice(2) );
        this.gG.map(gG_i => result += bn128.representation(gG_i).slice(2) );
        this.f.map(f_i =>  result += bn128.bytes(f_i).slice(2) );

        result += bn128.bytes(this.z_P).slice(2);
        result += bn128.bytes(this.z_U).slice(2);
        result += bn128.bytes(this.z_X).slice(2);

        result += bn128.representation(this.CPrime).slice(2);
        result += bn128.representation(this.DPrime).slice(2);
        result += bn128.representation(this.CLnPrime).slice(2);
        result += bn128.representation(this.CRnPrime).slice(2);

        this.tCommits.getVector().map((commit) => result += bn128.representation(commit).slice(2) );
        result += bn128.bytes(this.tHat).slice(2);
        result += bn128.bytes(this.tauX).slice(2);
        result += bn128.bytes(this.mu).slice(2);

        result += bn128.bytes(this.c).slice(2);
        result += bn128.bytes(this.s_sk).slice(2);
        result += bn128.bytes(this.s_r).slice(2);
        result += bn128.bytes(this.s_vTransfer).slice(2);
        result += bn128.bytes(this.s_vDiff).slice(2);
        result += bn128.bytes(this.s_nuTransfer).slice(2);
        result += bn128.bytes(this.s_nuDiff).slice(2);

        result += this.ipProof.serialize().slice(2);

        return result;
    }



    unserialize(arr){

        arr = Buffer.from( utils.fromHex(arr), "hex");

        this.A = G1Point( slice(arr, 0), slice(arr, 32) );
        this.S = G1Point( slice(arr, 64), slice(arr, 96));
        this.P = G1Point( slice(arr, 128), slice(arr, 160));
        this.Q = G1Point( slice(arr, 192), slice(arr, 224));
        this.U = G1Point( slice(arr, 256), slice(arr, 288));
        this.V = G1Point( slice(arr, 320), slice(arr, 352));
        this.X = G1Point( slice(arr, 384), slice(arr, 416));
        this.Y = G1Point( slice(arr, 448), slice(arr, 480));

        const m = Math.floor( (arr.length - 2144) / 576 );
        this.CLnG = new Array(m);
        this.CRnG = new Array(m);
        this.C_0G = new Array(m);
        this.y_0G = new Array(m);
        this.C_XG = new Array(m);
        this.y_XG = new Array(m);
        this.DG = new Array(m);
        this.gG = new Array(m);
        this.f = new Array(2 * m );

        for (let i=0; i < m; i++) {
            this.CLnG[i] = G1Point(slice(arr, 512 + i * 64), slice(arr, 544 + i * 64));
            this.CRnG[i] = G1Point(slice(arr, 512 + (m + i) * 64), slice(arr, 544 + (m + i) * 64));
            this.C_0G[i] = G1Point(slice(arr, 512 + m * 128 + i * 64), slice(arr, 544 + m * 128 + i * 64));
            this.y_0G[i] = G1Point(slice(arr, 512 + m * 192 + i * 64), slice(arr, 544 + m * 192 + i * 64));
            this.C_XG[i] = G1Point(slice(arr, 512 + m * 256 + i * 64), slice(arr, 544 + m * 256 + i * 64));
            this.y_XG[i] = G1Point(slice(arr, 512 + m * 320 + i * 64), slice(arr, 544 + m * 320 + i * 64));
            this.DG[i] = G1Point(slice(arr, 512 + m * 384 + i * 64), slice(arr, 544 + m * 384 + i * 64));
            this.gG[i] = G1Point(slice(arr, 512 + m * 448 + i * 64), slice(arr, 544 + m * 448 + i * 64));
            this.f[i] = slice(arr, 512 + m * 512 + i * 32);
            this.f[i + m] = slice(arr, 512 + m * 544 + i * 32);
        }

        const starting = m * 576;
        this.z_P = slice(arr, 512 + starting);
        this.z_U = slice(arr, 544 + starting);
        this.z_X = slice(arr, 576 + starting);

        this.CPrime = G1Point(slice(arr, 608 + starting), slice(arr, 640 + starting));
        this.DPrime = G1Point(slice(arr, 672 + starting), slice(arr, 704 + starting));
        this.CLnPrime = G1Point(slice(arr, 736 + starting), slice(arr, 768 + starting));
        this.CRnPrime = G1Point(slice(arr, 800 + starting), slice(arr, 832 + starting));

        this.tCommits = [G1Point(slice(arr, 864 + starting), slice(arr, 896 + starting)), G1Point(slice(arr, 928 + starting), slice(arr, 960 + starting))];
        this.tHat = slice(arr, 992 + starting);
        this.tauX = slice(arr, 1024 + starting);
        this.mu = slice(arr, 1056 + starting);

        this.c = slice(arr, 1088 + starting);
        this.s_sk = slice(arr, 1120 + starting);
        this.s_r = slice(arr, 1152 + starting);
        this.s_vTransfer = slice(arr, 1184 + starting);
        this.s_vDiff = slice(arr, 1216 + starting);
        this.s_nuTransfer = slice(arr, 1248 + starting);
        this.s_nuDiff = slice(arr, 1280 + starting);


        for (let i=0 ; i < utils.g_n; i++) {
            this.ipProof.ls[i] = G1Point(slice(arr, 1312 + starting + i * 64), slice(arr, 1344 + starting + i * 64));
            this.ipProof.rs[i] = G1Point(slice(arr, 1312 + starting + ( utils.g_n + i) * 64), slice(arr, 1344 + starting + (utils.g_n + i) * 64));
        }
        this.ipProof.a = slice(arr, 1312 + starting + utils.g_n * 128);
        this.ipProof.b = slice(arr, 1344 + starting + utils.g_n * 128);

    }

    toJSON(){
        return {
            A: this.A.toJSON(),
            S: this.S.toJSON(),
            P: this.P.toJSON(),
            Q: this.Q.toJSON(),
            U: this.U.toJSON(),
            V: this.V.toJSON(),
            X: this.X.toJSON(),
            Y: this.Y.toJSON(),
            CLnG: this.CLnG.map(it => it.toJSON() ),
            CRnG: this.CRnG.map(it => it.toJSON() ),
            C_0G: this.C_0G.map(it => it.toJSON() ),
            y_0G: this.y_0G.map(it => it.toJSON() ),
            C_XG: this.C_XG.map(it => it.toJSON() ),
            y_XG: this.y_XG.map(it => it.toJSON() ),
            DG: this.DG.map(it => it.toJSON() ),
            gG: this.gG.map(it => it.toJSON() ),
            f: this.f.map(it => utils.fixHexString( it ) ),
            z_P: utils.fixHexString( this.z_P ),
            z_U: utils.fixHexString( this.z_U ),
            z_X: utils.fixHexString( this.z_X ),
            CPrime: this.CPrime.toJSON(),
            DPrime: this.DPrime.toJSON(),
            CLnPrime: this.CLnPrime.toJSON(),
            CRnPrime: this.CRnPrime.toJSON(),
            tCommits: this.tCommits.map(it => it.toJSON() ),
            tHat: utils.fixHexString( this.tHat ),
            tauX: utils.fixHexString( this.tauX ),
            mu: utils.fixHexString( this.mu ),
            c: utils.fixHexString( this.c  ),
            s_sk: utils.fixHexString( this.s_sk ),
            s_r: utils.fixHexString( this.s_r ),
            s_vTransfer: utils.fixHexString( this.s_vTransfer ),
            s_vDiff: utils.fixHexString( this.s_vDiff ),
            s_nuTransfer: utils.fixHexString( this.s_nuTransfer ),
            s_nuDiff: utils.fixHexString( this.s_nuDiff ),
            ipProof: this.ipProof.toJSON(),

        }
    }


}


module.exports = ZetherProof;