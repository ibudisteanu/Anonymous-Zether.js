
class AnonAuxiliaries {

    constructor() {

        this.m = null;
        this.N = null;
        this.v = null;
        this.w = null;
        this.vPow = null;
        this.wPow = null;
        this.f = new Array(2); // could just allocate extra space in the proof?
        this.r = new Array(2); // each poly is an array of length N. evaluations of prods
        this.temp = null;
        this.CLnR = null;
        this.CRnR = null;
        this.CR = new Array(2);
        this.yR = new Array(2);
        this.C_XR = null;
        this.y_XR = null;
        this.gR = null;
        this.DR = null;

    }

}



module.exports = AnonAuxiliaries;