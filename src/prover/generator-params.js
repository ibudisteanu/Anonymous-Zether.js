const {GeneratorVector} = require('./algebra');
const { soliditySha3 } = require('web3-utils');
const utils = require('../utils/utils.js');

//optimized so we will calculate it only once

class GeneratorParamsData {

    constructor(n){

        this.g = utils.mapInto(soliditySha3("G"));
        this.h = utils.mapInto(soliditySha3("V"));

        this.gs = [];
        this.hs = [];

        for (let i = 0; i < n; i++) {
            this.gs.push(utils.mapInto(soliditySha3("G", i)));
            this.hs.push(utils.mapInto(soliditySha3("H", i)));
        }

    }

}

const paramData = new GeneratorParamsData(64);

class GeneratorParams{

    constructor(h, gs, hs) { // doing double duty also as a "VectorBase". comes empty

        this.g = paramData.g;

        if ( typeof(h) == 'number') {

            const number = h;
            this.h = paramData.h;
            this.gs = new GeneratorVector(paramData.gs.slice(number));
            this.hs = new GeneratorVector(paramData.hs.slice(number));
        } else {
            this.h = h;
            this.gs = gs;
            this.hs = hs;
        }

    }

    commit (gExp, hExp, blinding) {
        var result = this.h.mul(blinding);
        var gsVector = this.gs.getVector();
        var hsVector = this.hs.getVector();
        gExp.getVector().forEach((gExp, i) => {
            result = result.add(gsVector[i].mul(gExp));
        });
        hExp.getVector().forEach((hExp, i) => { // swap the order and enclose this in an if (hExp) if block if you want it optional.
            result = result.add(hsVector[i].mul(hExp));
        });
        return result;
    };

    commitRows (exp, blinding) { // exp is an m * 2 array...

        var result = this.h.mul(blinding);
        var gsVector = this.gs.getVector();
        var hsVector = this.hs.getVector();

        exp.forEach((exp_i, i) => {
            var expVector = exp_i.getVector();
            result = result.add(gsVector[i].mul(expVector[0]));
            result = result.add(hsVector[i].mul(expVector[1]));
        });

        return result;
    };

    getG () {
        return this.g;
    };
    getH () {
        return this.h;
    };
    getGs () {
        return this.gs;
    };
    getHs () {
        return this.hs;
    };
}

module.exports = GeneratorParams;