const utils = require('./../../utils/utils');
const bn128 = require('./../../utils/bn128');


class InnerProductProof {

    constructor(type = 'verifier') {

        this.type = type;
        if (type === 'verifier') this._n = utils.g_n;
        else if (type === 'burner') this._n = utils.gBurn_n;
        else throw "Error invalid type";

        this.ls = new Array(this._n);
        this.rs = new Array(this._n);
        this.a = null;
        this.b = null;

    }

    serialize(){

        var result = "0x";
        this.ls.map( l => result += bn128.representation(l).slice(2) );
        this.rs.forEach(r => result += bn128.representation(r).slice(2) );
        result += bn128.bytes(this.a).slice(2);
        result += bn128.bytes(this.b).slice(2);
        return result;

    }

    toJSON(){
        return {
            ls: this.ls.map(it => it.toJSON() ),
            rs: this.rs.map(it => it.toJSON() ),
            a: this.a.toString(16),
            b: this.b.toString(16),
        }
    }

    fromObject(other){
        this.ls = other.ls;
        this.rs = other.rs;
        this.a = other.a;
        this.b = other.b;
    }

}

module.exports = InnerProductProof;