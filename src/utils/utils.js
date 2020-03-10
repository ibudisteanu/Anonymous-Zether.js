const bn128 = require('./bn128.js')
const BN = require('bn.js')
const { soliditySha3 } = require('web3-utils');
const createKeccakHash = require('keccak');
const ABICoder = require('web3-eth-abi');

const utils = {};

utils.determinePublicKey = (x) => {
    return bn128.serialize(bn128.curve.g.mul(x));
};

utils.sign = (address, keypair) => {
    var k = bn128.randomScalar();
    var K = bn128.curve.g.mul(k);
    var c = utils.hash(ABICoder.encodeParameters([
        'address',
        'bytes32[2]',
        'bytes32[2]',
    ], [
        address,
        keypair['y'],
        bn128.serialize(K),
    ]));

    var s = c.redMul(keypair['x']).redAdd(k);
    return [bn128.bytes(c), bn128.bytes(s)];
};


utils.createAccount = () => {
    var x = bn128.randomScalar();
    var y = utils.determinePublicKey(x);
    return { 'x': x, 'y': y };
};

utils.mapInto = (seed) => { // seed is flattened 0x + hex string
    var seed_red = new BN(seed.slice(2), 16).toRed(bn128.p);
    var p_1_4 = bn128.curve.p.add(new BN(1)).div(new BN(4));
    while (true) {
        var y_squared = seed_red.redPow(new BN(3)).redAdd(new BN(3).toRed(bn128.p));
        var y = y_squared.redPow(p_1_4);
        if (y.redPow(new BN(2)).eq(y_squared)) {
            return bn128.curve.point(seed_red.fromRed(), y.fromRed());
        }
        seed_red.redIAdd(new BN(1).toRed(bn128.p));
    }
};

utils.gEpoch = (epoch) => {
    return utils.mapInto(soliditySha3("Zether", epoch));
};

utils.u = (epoch, x) => {
    return utils.gEpoch(epoch).mul(x);
};

utils.hash = (encoded) => { // ags are serialized
    return new BN(soliditySha3(encoded).slice(2), 16).toRed(bn128.q);
};

utils.keccak256 = (hex)=>{
    return '0x'+createKeccakHash('keccak256').update( utils.bufferFromHex(hex) ) .digest('hex');
}

utils.keccak256Simple = (input)=>{
    return '0x'+createKeccakHash('keccak256').update( input ) .digest('hex');
}

utils.fromHex = (hexStr) => {
    return hexStr.replace(/0x/g, '');
};

utils.bufferFromHex = (hexStr) => {
    return Buffer.from( hexStr.replace(/0x/g, ''), "hex");
};

utils.encodedPackaged = (array) => {

    const out =[];
    for (let i=0; i < array.length; i++)
        out.push( utils.bufferFromHex( array[i] ) );

    return '0x'+Buffer.concat(out).toString("hex");
};

utils.fixHexString = (hex, noBytes = 32, suffix = true )=>{

    if (Buffer.isBuffer(hex)) hex = hex.toString("hex");
    hex = hex.replace(/0x/g, '');

    if (hex.length % 2 === 1) hex = '0'+hex;

    return (suffix ? '0x' : '') + Buffer.alloc( 32 - Math.ceil( hex.length / 2 ) ).toString("hex" ) + hex;

};

utils.sleep = (wait) => new Promise((resolve) => { setTimeout(resolve, wait); });

utils.G1Point = (a,b)=>bn128.unserialize([a,b]);
utils.G1Point0 = ()=>utils.G1Point("0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000");

utils.slice = (a, pos, length = 32) => {
    const out = Buffer.alloc(length );
    a.copy( out, 0, pos);
    return '0x'+out.toString("hex");
};

utils.g_m = 64;
utils.g_n = 6;

utils.gBurn_m = 32;
utils.gBurn_n = 5;

utils.BNFieldfromHex = ( hex )=>{

    let out = hex;
    if (hex instanceof BN === false) out = new BN( utils.fromHex(hex), 16 );

    if (!out.red) out = out.toRed( bn128.q );

    return out;

};

module.exports = utils;