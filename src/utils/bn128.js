const BN = require('bn.js')
const EC = require('elliptic')
const crypto = require('crypto')

const FIELD_MODULUS = new BN("30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47", 16);
const GROUP_MODULUS = new BN("30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001", 16);
const UNITY_MODULUS = new BN("14a3074b02521e3b1ed9852e5028452693e87be4e910500c7ba9bbddb2f46edd", 16); // primitive 2^28th root of unity modulo q.
const B_MAX = 4294967295;

const bn128 = {};

bn128.curve = new EC.curve.short({
    a: '0',
    b: '3',
    p: FIELD_MODULUS,
    n: GROUP_MODULUS,
    gRed: false,
    g: ['77da99d806abd13c9f15ece5398525119d11e11e9836b2ee7d23f6159ad87d4', '1485efa927f2ad41bff567eec88f32fb0a0f706588b4e41a8d587d008b7f875'],
});

bn128.FIELD_MODULUS = FIELD_MODULUS;
bn128.UNITY_MODULUS = UNITY_MODULUS;
bn128.GROUP_MODULUS = GROUP_MODULUS;


bn128.zero = bn128.curve.g.mul(0);

bn128.p = BN.red(bn128.curve.p);
bn128.q = BN.red(bn128.curve.n);

bn128.B_MAX = B_MAX;
bn128.B_MAX_BN = new BN(B_MAX).toRed(bn128.q);

// Get a random BN in the bn128 curve group's reduction context
bn128.randomScalar = () => {
    return new BN(crypto.randomBytes(32), 16).toRed(bn128.q);
};

bn128.bytes = (i) => { // i is a BN (red)
    return "0x" + i.toString(16, 64);
};

bn128.toBuffer = (i) => { // i is a BN (red)
    return Buffer.from( i.toString(16, 64), 'hex');
};

bn128.serialize = (point) => {
    if (point.x == null && point.y == null)
        return ["0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000"];
    return [bn128.bytes(point.getX()), bn128.bytes(point.getY())];
};

bn128.serializeToBuffer = (point) => {
    if (point.x == null && point.y == null)
        return Buffer.alloc(64);
    return Buffer.concat([
        bn128.toBuffer(point.getX() ),
        bn128.toBuffer(point.getY() ),
    ])
};

bn128.unserialize = (serialization) => {
    if (serialization[0] == "0x0000000000000000000000000000000000000000000000000000000000000000" && serialization[1] == "0x0000000000000000000000000000000000000000000000000000000000000000")
        return bn128.zero;

    return bn128.curve.point(serialization[0].slice(2), serialization[1].slice(2)); // no check if valid curve point?
};

bn128.unserializeFromBuffer = (serialization) => {

    if (serialization.equals( Buffer.alloc(64)))
        return bn128.zero;

    const serializationHex = serialization.toString('hex');
    return bn128.curve.point(serializationHex.slice(0, 64), serializationHex.slice(64));
};

bn128.toVector = (point) => {
    return [ new BN( point.getX().toString() ).toRed(bn128.q),new BN( point.getY().toString() ).toRed(bn128.q) ];
};


bn128.representation = (point) => {
    var temp = bn128.serialize(point);
    return temp[0] + temp[1].slice(2);
};



bn128.B_MAX = B_MAX;

module.exports = bn128;