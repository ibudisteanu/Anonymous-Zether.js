const {GeneratorVector} = require('./algebra');
const { soliditySha3 } = require('web3-utils');
const utils = require('../utils/utils.js');

//optimized so we will calculate it only once

class GeneratorParamsData {

    constructor(n){

        this.g = utils.mapInto(soliditySha3("G"));
        this.h = utils.mapInto(soliditySha3("H"));

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

        if ( typeof h == 'number') {

            const number = h;

            this.h = paramData.h;
            this.gsVector = new GeneratorVector(paramData.gs.slice(0, number));
            this.hsVector = new GeneratorVector(paramData.hs.slice(0, number));

        } else {
            this.h = h;
            this.gsVector = gs;
            this.hsVector = hs;
        }

        this.gs = this.gsVector.getVector();
        this.hs = this.hsVector.getVector();

    }

    commit (blinding, gExp, hExp) {
        var result = this.h.mul(blinding);
        var gsVector = this.gsVector.getVector();
        gExp.getVector().forEach((gExp, i) => {
            result = result.add(gsVector[i].mul(gExp));
        });

        if (hExp) {
            var hsVector = this.hsVector.getVector();
            hExp.getVector().forEach((hExp, i) => { // swap the order and enclose this in an if (hExp) if block if you want it optional.
                result = result.add(hsVector[i].mul(hExp));
            });
        }
        return result;
    };

    getG () {
        return this.g;
    };
    getH () {
        return this.h;
    };
    getGs () {
        return this.gsVector;
    };
    getHs () {
        return this.hsVector;
    };
}

module.exports = GeneratorParams;