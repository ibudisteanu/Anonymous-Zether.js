const utils = require('./../../utils/utils');

class IPAuxiliaries {

    constructor(type) {

        this.type = type;
        if (type === 'verifier') this._m = utils.g_m;
        else if (type === 'burner') this._m = utils.gBurn_m;
        else throw "Error invalid type";

        this.u_x = null;
        this.hPrimes = new Array(this._m);
        this.hExp = new Array(this._m);
        this.P = null;
        this.o = null;
        this.challenges = new Array(this._m);
        this.otherExponents = new Array(this._m);

    }


}

module.exports = IPAuxiliaries;