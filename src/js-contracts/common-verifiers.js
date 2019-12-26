const BN = require('bn.js');
const bn128 = require("./../utils/bn128");
const utils = require('./../utils/utils');

const IPAuxiliaries = require('./../prover/schemas/ip-auxiliaries');
const InnerProductProof = require('./../prover/schemas/inner-product-proof');
const ABICoder = require('web3-eth-abi');

const G1Point = utils.G1Point;
const G1Point0 = utils.G1Point0;
const BNFieldfromHex = utils.BNFieldfromHex;

const { FieldVector, GeneratorVector, AdvancedMath } = require('./../prover/algebra.js');

class CommonVerifiers{

    constructor(type, params, m,n){

        this.params = params;
        this._n = n;
        this._m = m;
        this._type = type;
    }

    //IDENTICAL
    verify(proof, sigmaAuxiliaries, auxiliaries){

        if ( sigmaAuxiliaries.c.eq( BNFieldfromHex(proof.c) === false ) ) throw "Sigma protocol challenge equality failure.";

        const ipAuxiliaries = new IPAuxiliaries(this._type);
        ipAuxiliaries.o = utils.hash(ABICoder.encodeParameters([
            'bytes32',
        ], [
            bn128.bytes(sigmaAuxiliaries.c),
        ]));
        ipAuxiliaries.u_x = this.params.g.mul( ipAuxiliaries.o );
        ipAuxiliaries.hPrimes = this.params.hs.map( (it, index) => it.mul( auxiliaries.ys[index].redInvm()  ) ); //hadamardInv
        ipAuxiliaries.hExp = new FieldVector(auxiliaries.ys).times(  auxiliaries.z ).add( new FieldVector( auxiliaries.twoTimesZSquared ) ).getVector();

        ipAuxiliaries.P = proof.BA.add(  proof.BS.mul( auxiliaries.x )).add( new GeneratorVector(this.params.gs).sum().mul( auxiliaries.z.redNeg()) ).add( new GeneratorVector(ipAuxiliaries.hPrimes).commitPoints( new FieldVector(ipAuxiliaries.hExp) ));
        ipAuxiliaries.P = ipAuxiliaries.P.add( this.params.h.mul( BNFieldfromHex(proof.mu).redNeg() ));
        ipAuxiliaries.P = ipAuxiliaries.P.add( ipAuxiliaries.u_x.mul( BNFieldfromHex(proof.tHat) ));

        // begin inner product verification
        const ipProof = new InnerProductProof('burner');
        ipProof.fromObject( proof.ipProof );

        for (let i = 0; i < this._n; i++) {

            ipAuxiliaries.o = utils.hash(ABICoder.encodeParameters([
                'bytes32',
                'bytes32[2]',
                'bytes32[2]',
            ], [
                '0x'+ipAuxiliaries.o.toString(16),
                bn128.serialize(ipProof.ls[i]),
                bn128.serialize(ipProof.rs[i]),
            ]));

            ipAuxiliaries.challenges[i] = ipAuxiliaries.o; // overwrites value
            const xInv = ipAuxiliaries.o.redInvm();
            ipAuxiliaries.P = ipAuxiliaries.P.add(  ipProof.ls[i].mul( ipAuxiliaries.o.redPow( new BN(2) ) ).add( ipProof.rs[i].mul( xInv.redPow(new BN(2) ))));
        }

        ipAuxiliaries.otherExponents[0] = new BN(1).toRed(bn128.q);
        for (let i = 0; i < this._n; i++)
            ipAuxiliaries.otherExponents[0] = ipAuxiliaries.otherExponents[0].redMul(ipAuxiliaries.challenges[i]);

        const bitSet = new Array(this._m) ;
        ipAuxiliaries.otherExponents[0] = ipAuxiliaries.otherExponents[0].redInvm();
        for (let i=0; i < this._m / 2; ++i)
            for (let j = 0; (1 << j) + i < this._m; ++j) {
                const i1 = i + (1 << j);
                if (!bitSet[i1]) {
                    const temp = ipAuxiliaries.challenges[ this._n - 1 - j].redMul(ipAuxiliaries.challenges[this._n - 1 - j]);
                    ipAuxiliaries.otherExponents[i1] = ipAuxiliaries.otherExponents[i].redMul(temp);
                    bitSet[i1] = true;
                }
            }


        let gTemp = G1Point0();
        let hTemp = G1Point0();
        for (let i = 0; i < this._m; i++) {
            gTemp = gTemp.add( this.params.gs[i].mul( ipAuxiliaries.otherExponents[i] ) );
            hTemp = hTemp.add( ipAuxiliaries.hPrimes[i].mul( ipAuxiliaries.otherExponents[ this._m - 1 - i]));
        }
        const cProof = gTemp.mul( BNFieldfromHex(ipProof.a) ).add( hTemp.mul( BNFieldfromHex(ipProof.b) )).add( ipAuxiliaries.u_x.mul( BNFieldfromHex(ipProof.a).redMul( BNFieldfromHex(ipProof.b) )));
        if ( !ipAuxiliaries.P.eq( cProof) )
            throw "Inner product equality check failure.";

        return true;


    }

}

module.exports = CommonVerifiers;