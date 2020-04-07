const bn128 = require('./bn128.js')
const BN = require('bn.js')
const { soliditySha3 } = require('web3-utils');
const createKeccakHash = require('keccak');
const ABICoder = require('web3-eth-abi');

const utils = {};

utils.determinePublicKey = (x) => {
    return bn128.curve.g.mul(  x );
};

utils.sign = (address, keypair, secret ) => {

    let k;
    if (!secret ) k = bn128.randomScalar();
    else {
        if ( !Buffer.isBuffer(secret) || secret.length !== 32 ) throw "secret must be a 32 byte buffer";
        k = new BN( secret.toString('hex') , 16).toRed(bn128.q);
    }

    const K = bn128.curve.g.mul(k);
    const c = utils.hash(ABICoder.encodeParameters([
        'address',
        'bytes32[2]',
        'bytes32[2]',
    ], [
        address,
        bn128.serialize(keypair.y),
        bn128.serialize(K),
    ]));

    const s = c.redMul( keypair.x ).redAdd(k);
    return [ c, s ];
};


utils.createAccount = (x) => {

    if (!x) x = bn128.randomScalar();

    const y = utils.determinePublicKey(x);
    return {
        x,
        y
    };
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

utils.gEpoch = epoch => utils.mapInto(soliditySha3("Zether", epoch));

utils.u = (epoch, x) => utils.gEpoch(epoch).mul(x);

utils.hash = (encoded) => { // ags are serialized
    return new BN(soliditySha3(encoded).slice(2), 16).toRed(bn128.q);
};

utils.keccak256 = (hex)=>{
    return '0x'+createKeccakHash('keccak256').update( utils.bufferFromHex(hex) ) .digest('hex');
};

utils.keccak256Simple = (input)=>{
    return '0x'+createKeccakHash('keccak256').update( input ) .digest('hex');
};

utils.fromHex = (hexStr) => {
    return hexStr.replace(/0x/g, '');
};

utils.bufferFromHex = (hexStr) => {
    return Buffer.from( hexStr.replace(/0x/g, ''), "hex");
};

utils.encodedPackaged = (array) => {

    if (!Array.isArray(array)) throw "wrong input. Array is not an array";

    const out =[];
    for (let i=0; i < array.length; i++)
        out.push( utils.bufferFromHex( array[i] ) );

    return '0x'+Buffer.concat(out).toString("hex");
};

utils.sleep = wait => new Promise(resolve => setTimeout(resolve, wait) );

utils.G1Point = (a,b)=>bn128.unserialize([a,b]);
utils.G1Point0 = ()=>utils.G1Point("0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000");
utils.G1Point0Const = utils.G1Point0();


utils.G1PointBuffer = (a) => {
    return bn128.unserialize([ a[0], a[1] ]);
};

utils.g = () => utils.G1Point('0x077da99d806abd13c9f15ece5398525119d11e11e9836b2ee7d23f6159ad87d4', '0x01485efa927f2ad41bff567eec88f32fb0a0f706588b4e41a8d587d008b7f875' );

utils.h = () => utils.G1Point('0x01b7de3dcf359928dd19f643d54dc487478b68a5b2634f9f1903c9fb78331aef', '0x2bda7d3ae6a557c716477c108be0d0f94abc6c4dc6b1bd93caccbcceaaa71d6b' );

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

    let out;

    if (Buffer.isBuffer(hex)) out = new BN(  hex.toString('hex'), 16 );
    else if (hex instanceof BN === false && typeof hex === "string") out = new BN( utils.fromHex(hex), 16 );
    else out = hex;

    if (out instanceof BN === false) throw "input is invalid";

    if (!out.red) out = out.toRed( bn128.q );

    return out;

};

module.exports = utils;