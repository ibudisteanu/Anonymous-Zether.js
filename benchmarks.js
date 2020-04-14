const utils  = require("./src/utils/utils");
const bn128 = require("./src/utils/bn128");
const ZSC = require("./src/js-contracts/zsc");

function msToTime(s) {
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;

    return hrs + ':' + mins + ':' + secs + '.' + ms;
}

function benchmarkReadBalance (steps = 100000) {

    console.log("Running Benchmark Read Balance");

    const to0 = new Date().getTime();

    const gB = utils.BNFieldfromHex("aad1ed130e5664bbc1ef09bb765b7a32f53df664b5d6cbe0c5214faaa26a484f");

    let accumulator = bn128.zero;
    const finalSteps = Math.min(steps, bn128.B_MAX);
    for (let  i = 0; i < finalSteps; i++) {

        if (accumulator.eq(gB)) return i;

        accumulator = accumulator.add( bn128.curve.g );

    }

    const to1 = new Date().getTime();
    console.log("        ", to1-to0, "ms", "in seconds",msToTime(to1-to0), "steps", finalSteps );

    return 0;
}

benchmarkReadBalance();