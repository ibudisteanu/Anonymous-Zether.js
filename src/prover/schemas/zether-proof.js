const bn128 = require("./../../utils/bn128");
const utils = require('./../../utils/utils');

const InnerProductProof= require('./inner-product-proof');

const slice = utils.slice;
const G1Point = utils.G1Point;
const BNFieldfromHex = utils.BNFieldfromHex;

class ZetherProof {

    constructor() {

        this.BA = null;
        this.BS = null;
        this.A = null;
        this.B = null;
        this.C = null;
        this.D = null;
        this.E = null;
        this.F = null;


        this.CLnG = [];
        this.CRnG = [];
        this.C_0G = [];
        this.DG = [];
        this.y_0G = [];
        this.gG = [];
        this.C_XG = [];
        this.y_XG = [];

        this.f = [];
        this.z_A = null;
        this.z_C = null;
        this.z_E = null;

        this.tCommits = new Array(2);
        this.tHat = null;
        this.mu = null;

        this.c = null;
        this.s_sk = null;
        this.s_r = null;
        this.s_b = null;
        this.s_tau = null;

        this.ipProof = new InnerProductProof('verifier');

    };

    serialize () { // please initialize this before calling this method...
        var result = "0x";
        result += bn128.representation(this.BA).slice(2);
        result += bn128.representation(this.BS).slice(2);
        result += bn128.representation(this.A).slice(2);
        result += bn128.representation(this.B).slice(2);

        this.CLnG.forEach((CLnG_k) => { result += bn128.representation(CLnG_k).slice(2); });
        this.CRnG.forEach((CRnG_k) => { result += bn128.representation(CRnG_k).slice(2); });
        this.C_0G.forEach((C_0G_k) => { result += bn128.representation(C_0G_k).slice(2); });
        this.DG.forEach((DG_k) => { result += bn128.representation(DG_k).slice(2); });
        this.y_0G.forEach((y_0G_k) => { result += bn128.representation(y_0G_k).slice(2); });
        this.gG.forEach((gG_k) => { result += bn128.representation(gG_k).slice(2); });
        this.C_XG.forEach((C_XG_k) => { result += bn128.representation(C_XG_k).slice(2); });
        this.y_XG.forEach((y_XG_k) => { result += bn128.representation(y_XG_k).slice(2); });
        this.f.getVector().forEach((f_k) => { result += bn128.bytes(f_k).slice(2); });

        result += bn128.bytes(this.z_A).slice(2);

        this.tCommits.getVector().forEach((commit) => {
            result += bn128.representation(commit).slice(2);
        });
        result += bn128.bytes(this.tHat).slice(2);
        result += bn128.bytes(this.mu).slice(2);

        result += bn128.bytes(this.c).slice(2);
        result += bn128.bytes(this.s_sk).slice(2);
        result += bn128.bytes(this.s_r).slice(2);
        result += bn128.bytes(this.s_b).slice(2);
        result += bn128.bytes(this.s_tau).slice(2);

        result += this.ipProof.serialize().slice(2);

        return result;
    }



    unserialize(arr){

        if (typeof arr === "string") arr = Buffer.from( utils.bufferFromHex(arr), "hex");

        this.BA = G1Point( slice(arr, 0), slice(arr, 32) );
        this.BS = G1Point( slice(arr, 64), slice(arr, 96));
        this.A = G1Point( slice(arr, 128), slice(arr, 160));
        this.B = G1Point( slice(arr, 192), slice(arr, 224));

        const m = Math.floor( (arr.length - 1472) / 576 );
        this.CLnG = new Array(m);
        this.CRnG = new Array(m);
        this.C_0G = new Array(m);
        this.DG = new Array(m);
        this.y_0G = new Array(m);
        this.gG = new Array(m);
        this.C_XG = new Array(m);
        this.y_XG = new Array(m);
        this.f = new Array(2 * m );

        for (let k=0; k < m; k++) {
            this.CLnG[k] = G1Point(slice(arr, 256 + k * 64), slice(arr, 288 + k * 64));
            this.CRnG[k] = G1Point(slice(arr, 256 + (m + k) * 64), slice(arr, 288 + (m + k) * 64));
            this.C_0G[k] = G1Point(slice(arr, 256 + m * 128 + k * 64), slice(arr, 288 + m * 128 + k * 64));
            this.DG[k] = G1Point(slice(arr, 256 + m * 192 + k * 64), slice(arr, 288 + m * 192 + k * 64));
            this.y_0G[k] = G1Point(slice(arr, 256 + m * 256 + k * 64), slice(arr, 288 + m * 256 + k * 64));
            this.gG[k] = G1Point(slice(arr, 256 + m * 320 + k * 64), slice(arr, 288 + m * 320 + k * 64));
            this.C_XG[k] = G1Point(slice(arr, 256 + m * 384 + k * 64), slice(arr, 288 + m * 384 + k * 64));
            this.y_XG[k] = G1Point(slice(arr, 256 + m * 448 + k * 64), slice(arr, 288 + m * 448 + k * 64));
            this.f[k] = BNFieldfromHex(slice(arr, 256 + m * 512 + k * 32));
            this.f[k + m] = BNFieldfromHex(slice(arr, 256 + m * 544 + k * 32));
        }

        const starting = m * 576;
        this.z_A = BNFieldfromHex( slice(arr, 256 + starting) );

        this.tCommits = [ utils.G1Point( utils.slice(arr, 288 + starting), utils.slice(arr, 320 + starting)), utils.G1Point( utils.slice(arr, 352 + starting), utils.slice(arr, 384 + starting))];
        this.tHat = BNFieldfromHex( utils.slice(arr, 416 + starting) );
        this.mu = BNFieldfromHex( utils.slice(arr, 448 + starting) );

        this.c = BNFieldfromHex( slice(arr, 480 + starting) );
        this.s_sk = BNFieldfromHex( slice(arr, 512 + starting) );
        this.s_r = BNFieldfromHex( slice(arr, 544 + starting) );
        this.s_b = BNFieldfromHex( slice(arr, 576 + starting) );
        this.s_tau = BNFieldfromHex( slice(arr, 608 + starting) );

        for (let i=0 ; i < utils.g_n; i++) {
            this.ipProof.ls[i] = G1Point(slice(arr, 640 + starting + i * 64), slice(arr, 672 + starting + i * 64));
            this.ipProof.rs[i] = G1Point(slice(arr, 640 + starting + ( utils.g_n + i) * 64), slice(arr, 672 + starting + (utils.g_n + i) * 64));
        }

        this.ipProof.a = BNFieldfromHex( slice(arr, 640 + starting + utils.g_n * 128) );
        this.ipProof.b = BNFieldfromHex( slice(arr, 672 + starting + utils.g_n * 128) );

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
            f: this.f.map(it => it.toString(16) ),
            tCommits: this.tCommits.map(it => it.toJSON() ),
            tHat: this.tHat.toString(16) ,
            mu: this.mu.toString(16),
            c: this.c.toString(16),
            s_sk: this.s_sk.toString(16),
            s_r: this.s_r.toString(16),
            s_b: this.s_b.toString(16),
            s_tau: this.s_tau.toString(16),
            ipProof: this.ipProof.toJSON(),

        }
    }


}


module.exports = ZetherProof;