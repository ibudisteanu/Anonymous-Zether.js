const bn128  = require('./../../utils/bn128');
const utils = require('./../../utils/utils');

class BurnAuxiliaries {

    constructor(props) {

        this.y = null;
        this.ys = new Array(utils.gBurn_m);
        this.z = null;
        this.zs = new Array(1); // silly. just to match zether.
        this.zSum = null;
        this.twoTimesZSquared = new Array(utils.gBurn_m);
        this.x = null;
        this.t = null;
        this.k = null;
        this.tEval = null;

    }




}

module.exports = BurnAuxiliaries;