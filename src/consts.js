const consts = {
    BLOCK_TIME_OUT: 1000,
    EPOCH_LENGTH: 6,
};

consts.away = () => { // returns ms away from next epoch change
    var current = (new Date).getTime();
    return Math.ceil(current / (consts.EPOCH_LENGTH * consts.BLOCK_TIME_OUT)) * (consts.EPOCH_LENGTH * consts.BLOCK_TIME_OUT) - current;
};

consts.getEpoch = (timestamp) => {
    return Math.floor(( timestamp === undefined ? (new Date).getTime() : timestamp) / consts.BLOCK_TIME_OUT / consts.EPOCH_LENGTH);
};

module.exports = consts;