const utils = require('./utils/utils');
const BN = require('bn.js');
const bn128 = require('./utils/bn128');

const consts = {
    BLOCK_TIME_OUT: 1000,
    EPOCH_LENGTH: 10,

    FEE: 1,
    FEE_BN: new BN(1).toRed(bn128.q),
    MINER_HASH : utils.keccak256( utils.encodedPackaged( [ "0x0f838e94b69650dab59ac6c796590df9b3baa79b6caeff5626cf8a1211346236", "0x25d8c3e03faebc2749f4af2446c467cc19ba2ff92ba67513bb11ad5dbf8656c6" ])),

    epoch: 10,
};

consts.away = () => { // returns ms away from next epoch change

    return 60*1000;

    var current = (new Date).getTime();
    return Math.ceil(current / (consts.EPOCH_LENGTH * consts.BLOCK_TIME_OUT)) * (consts.EPOCH_LENGTH * consts.BLOCK_TIME_OUT) - current;
};

consts.getEpoch = (timestamp) => {

    return consts.epoch;

    return Math.floor(( timestamp === undefined ? (new Date).getTime() : timestamp) / consts.BLOCK_TIME_OUT / consts.EPOCH_LENGTH);
};

consts.incrementEpoch = ()=>{
    consts.epoch += 1;
}

module.exports = consts;