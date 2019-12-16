const utils = require('./../../utils/utils')

class ZetherAuxiliaries {
    constructor(){

        this.y = null;
        this.ys = new Array(utils.g_m);
        this.z = null;
        this.zs = new Array(2); // [z^2, z^3]
        this.twoTimesZSquared = new Array(utils.g_m);
        this.zSum = null ;
        this.x = null;
        this.t = null;
        this.k = null;
        this.tEval = null;

    }
}

module.exports = ZetherAuxiliaries;