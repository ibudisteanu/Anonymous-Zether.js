const BN = require('bn.js');
const bn128 = require("./../utils/bn128");
const utils = require('./../utils/utils');
const ABICoder = require('web3-eth-abi');
const { FieldVector, AdvancedMath } = require('./../prover/algebra.js');
const GeneratorParams = require('./../prover/generator-params');

const consts = require('./../consts');

const G1Point = utils.G1Point;
const G1Point0 = utils.G1Point0;
const BNFieldfromHex = utils.BNFieldfromHex;

const ZetherProof = require('./../prover/schemas/zether-proof');
const ZetherStatement = require('./../prover/schemas/zether-statement');
const AnonAuxiliaries = require('./../prover/schemas/anon-auxiliaries');
const ZetherAuxiliaries = require('./../prover/schemas/zether-auxiliaries');
const SigmaAuxiliaries = require('./../prover/schemas/sigma-auxiliaries');

const CommonVerifier = require('./common-verifiers');

const g_n = utils.g_n;
const g_m = utils.g_m;

class ZVerifier{

    constructor(){

        this.params = new GeneratorParams(g_m);


        this._commonVerifier = new CommonVerifier( 'verifier', this.params, g_m, g_n);

        // this._commonVerifier.params.gs.map( (it, index) => console.log( 'gs['+index+'] = ' + bn128.serialize(it)) );
        // console.log('--------------');
        // console.log('--------------');
        // this._commonVerifier.params.hs.map( (it, index) => console.log( 'hs['+index+'] = ' + bn128.serialize(it)) );

    }

    verifyTransfer(CLn, CRn, C, D, y, epoch, u, proof){

        const statement = new ZetherStatement();
        const size = y.length;

        statement.initializeBySize(size);

        for (let i=0; i< size; i++){

            statement.CLn[i] = G1Point(  CLn[i][0], CLn[i][1]);
            statement.CRn[i] = G1Point(  CRn[i][0], CRn[i][1] );
            statement.C[i] = G1Point(C[i][0], C[i][1] );
            statement.y[i] = G1Point(  y[i][0] , y[i][1] );

        }
        statement.D = G1Point( D[0], D[1]  );
        statement.epoch = epoch;
        statement.u = G1Point( u[0], u[1]  );

        const zetherProof = new ZetherProof();
        zetherProof.unserialize(proof);

        return this.verify(statement, zetherProof);
    }

    verify(statement, proof){

        var statementHash = utils.hash(ABICoder.encodeParameters([
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2]',
            'bytes32[2][]',
            'uint256'
        ], [
            statement.CLn.map ( bn128.serialize  ),
            statement.CRn.map ( bn128.serialize  ),
            statement.C.map ( bn128.serialize  ),
            statement.D.serialize() ,
            statement.y.map ( bn128.serialize  ),
            statement.epoch
        ]));


        const anonAuxiliaries = new AnonAuxiliaries();
        anonAuxiliaries.v = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(statementHash),
            proof.BA.serialize(),
            proof.BS.serialize(),
            proof.A.serialize(),
            proof.B.serialize(),
            proof.C.serialize(),
            proof.D.serialize(),
            proof.E.serialize(),
            proof.F.serialize(),
        ]));

        anonAuxiliaries.w = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
            'bytes32[2][]',
        ], [
            bn128.bytes(anonAuxiliaries.v),
            proof.CLnG.map(bn128.serialize),
            proof.CRnG.map(bn128.serialize),
            proof.C_0G.map(bn128.serialize),
            proof.DG.map(bn128.serialize),
            proof.y_0G.map(bn128.serialize),
            proof.gG.map(bn128.serialize),
            proof.C_XG.map(bn128.serialize),
            proof.y_XG.map(bn128.serialize),
        ]));


        anonAuxiliaries.m = Math.floor( proof.f.length / 2 ) ; //!!! FLOOR
        anonAuxiliaries.N = Math.pow(2, anonAuxiliaries.m );

        anonAuxiliaries.f = new Array( 2 * anonAuxiliaries.m );

        for (let k=0; k < 2 * anonAuxiliaries.m; k++) {
            anonAuxiliaries.f[k] = new Array(2);
            anonAuxiliaries.f[k][1] = BNFieldfromHex( proof.f[k] );
            anonAuxiliaries.f[k][0] = anonAuxiliaries.w.redSub(  BNFieldfromHex(proof.f[k]) );
        }


        anonAuxiliaries.temp = G1Point0();


        for (let k=0; k < 2 * anonAuxiliaries.m; k++)
            anonAuxiliaries.temp = anonAuxiliaries.temp.add(  this.params.gs[k].mul( anonAuxiliaries.f[k][1]) ) ;


        if (proof.B.mul(anonAuxiliaries.w).add(proof.A).eq( anonAuxiliaries.temp.add( this.params.h.mul(  BNFieldfromHex( proof.z_A)) ) ) === false) throw "Recovery failure for B^w * A.";


        anonAuxiliaries.temp = G1Point0();
        for (let k = 0; k < 2 * anonAuxiliaries.m; k++)  // danger... gs and hs need to be big enough.
            anonAuxiliaries.temp = anonAuxiliaries.temp.add( (this.params.gs[k].mul( anonAuxiliaries.f[k][1].redMul( anonAuxiliaries.w.redSub( anonAuxiliaries.f[k][1])))) );


        if ( proof.C.mul(anonAuxiliaries.w).add(proof.D).eq( anonAuxiliaries.temp.add( this.params.h.mul(  BNFieldfromHex( proof.z_C) ) ) )  === false ) throw "Recovery failure for C^w * D.";

        anonAuxiliaries.temp = this.params.gs[0].mul( anonAuxiliaries.f[0][1].redMul(anonAuxiliaries.f[anonAuxiliaries.m][1])).add( this.params.gs[1].mul( anonAuxiliaries.f[0][0].redMul(anonAuxiliaries.f[anonAuxiliaries.m][0])));

        if ( proof.F.mul( anonAuxiliaries.w ).add( proof.E ).eq( anonAuxiliaries.temp.add( this.params.h.mul(  BNFieldfromHex( proof.z_E ) )  ) ) === false ) throw "Recovery failure for F^w * E";

        anonAuxiliaries.r = this.assemblePolynomials(anonAuxiliaries.f);

        anonAuxiliaries.CR = this.assembleConvolutions(anonAuxiliaries.r, statement.C);
        anonAuxiliaries.yR = this.assembleConvolutions(anonAuxiliaries.r, statement.y);

        anonAuxiliaries.CLnR = G1Point0();
        anonAuxiliaries.CRnR = G1Point0();
        for (let i = 0; i < anonAuxiliaries.N; i++) {
            anonAuxiliaries.CLnR = anonAuxiliaries.CLnR.add( statement.CLn[i].mul( anonAuxiliaries.r[i][0]));
            anonAuxiliaries.CRnR = anonAuxiliaries.CRnR.add( statement.CRn[i].mul( anonAuxiliaries.r[i][0]));
        }
        anonAuxiliaries.vPow = new BN(1).toRed(bn128.q);
        anonAuxiliaries.C_XR = G1Point0();
        anonAuxiliaries.y_XR = G1Point0();
        for (let i = 0; i < anonAuxiliaries.N; i++) {
            anonAuxiliaries.C_XR = anonAuxiliaries.C_XR.add( anonAuxiliaries.CR[ Math.floor(i / 2) ][i % 2].mul( anonAuxiliaries.vPow));
            anonAuxiliaries.y_XR = anonAuxiliaries.y_XR.add(anonAuxiliaries.yR[  Math.floor(i / 2) ][i % 2].mul( anonAuxiliaries.vPow));
            if (i > 0)
                anonAuxiliaries.vPow = anonAuxiliaries.vPow.redMul(anonAuxiliaries.v);

        }
        anonAuxiliaries.wPow = new BN(1).toRed(bn128.q);
        anonAuxiliaries.DR = G1Point0();
        anonAuxiliaries.gR = G1Point0();
        for (let k = 0; k < anonAuxiliaries.m; k++) {
            anonAuxiliaries.CLnR = anonAuxiliaries.CLnR.add( proof.CLnG[k].mul( anonAuxiliaries.wPow.redNeg() ));
            anonAuxiliaries.CRnR = anonAuxiliaries.CRnR.add( proof.CRnG[k].mul( anonAuxiliaries.wPow.redNeg() ));
            anonAuxiliaries.CR[0][0] = anonAuxiliaries.CR[0][0].add( proof.C_0G[k].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.DR = anonAuxiliaries.DR.add( proof.DG[k].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.yR[0][0] = anonAuxiliaries.yR[0][0].add( proof.y_0G[k].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.gR = anonAuxiliaries.gR.add( proof.gG[k].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.C_XR = anonAuxiliaries.C_XR.add( proof.C_XG[k].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.y_XR = anonAuxiliaries.y_XR.add( proof.y_XG[k].mul( anonAuxiliaries.wPow.redNeg()));

            anonAuxiliaries.wPow = anonAuxiliaries.wPow.redMul(anonAuxiliaries.w);
        }
        anonAuxiliaries.DR = anonAuxiliaries.DR.add( statement.D.mul( anonAuxiliaries.wPow));
        anonAuxiliaries.gR = anonAuxiliaries.gR.add( this.params.g.mul( anonAuxiliaries.wPow));
        anonAuxiliaries.C_XR = anonAuxiliaries.C_XR.add( this.params.g.mul( consts.FEE_BN.neg() ).mul(  anonAuxiliaries.wPow )); // this "subtracts back" the fee, which we added to the recipient's amount, before checking for balance.


        const zetherAuxiliaries = new ZetherAuxiliaries();


        //to test

        zetherAuxiliaries.y = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(anonAuxiliaries.w),
            bn128.serialize( proof.CPrime ),
            bn128.serialize( proof.DPrime ),
            bn128.serialize( proof.CLnPrime ),
            bn128.serialize( proof.CRnPrime ),
        ]));

        zetherAuxiliaries.ys = AdvancedMath.powers(zetherAuxiliaries.y);


        zetherAuxiliaries.z = utils.hash(ABICoder.encodeParameters([
            `bytes32`,
        ], [
            bn128.bytes(zetherAuxiliaries.y),
        ]));


        zetherAuxiliaries.zs = [ zetherAuxiliaries.z.redPow( new BN(2) ), zetherAuxiliaries.z.redPow( new BN(3) ) ];
        zetherAuxiliaries.zSum = zetherAuxiliaries.zs[0].redAdd(zetherAuxiliaries.zs[1]).redMul(zetherAuxiliaries.z);

                                                                                                                                                                                        //Math.pow safe as g_m/2 is <= 32
        zetherAuxiliaries.k = new FieldVector( zetherAuxiliaries.ys ).sum().redMul(zetherAuxiliaries.z.redSub(zetherAuxiliaries.zs[0])).redSub(zetherAuxiliaries.zSum.redMul(   new BN( Math.pow(2, g_m/2)).toRed(bn128.q)  ).redSub(zetherAuxiliaries.zSum))
        zetherAuxiliaries.t = BNFieldfromHex(proof.tHat).redSub(zetherAuxiliaries.k);


        for (let i = 0; i < g_m / 2; i++) {
            zetherAuxiliaries.twoTimesZSquared[i] = zetherAuxiliaries.zs[0].redMul(  new BN( Math.pow(2, i) ).toRed(bn128.q)  );    //safe, i <= 32
            zetherAuxiliaries.twoTimesZSquared[i + g_m / 2] = zetherAuxiliaries.zs[1].redMul( new BN( Math.pow(2, i  )).toRed(bn128.q) );  //safe, i <= 2
        }

        zetherAuxiliaries.x = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2][2]',
        ], [
            bn128.bytes(zetherAuxiliaries.z),
            proof.tCommits.map( bn128.serialize ),
        ]));

        zetherAuxiliaries.tEval = proof.tCommits[0].mul ( zetherAuxiliaries.x ).add( proof.tCommits[1].mul( zetherAuxiliaries.x.redMul(zetherAuxiliaries.x) )); // replace with "commit"?

        const sigmaAuxiliaries = new SigmaAuxiliaries();
        sigmaAuxiliaries.A_y = anonAuxiliaries.gR.mul( BNFieldfromHex( proof.s_sk ) ).add( anonAuxiliaries.yR[0][0].mul( BNFieldfromHex(proof.c).redNeg() ));
        sigmaAuxiliaries.A_D = this.params.g.mul( BNFieldfromHex(proof.s_r ) ).add( statement.D.mul( BNFieldfromHex( proof.c ) .redNeg()));
        sigmaAuxiliaries.gEpoch = utils.gEpoch( statement.epoch ) ;

        sigmaAuxiliaries.A_u = sigmaAuxiliaries.gEpoch.mul( BNFieldfromHex( proof.s_sk ) ).add( statement.u.mul( BNFieldfromHex( proof.c ).redNeg()  ));


        sigmaAuxiliaries.A_X = anonAuxiliaries.y_XR.mul( BNFieldfromHex( proof.s_r) ).add( anonAuxiliaries.C_XR.mul( BNFieldfromHex( proof.c) .redNeg()  ) ) ;

        sigmaAuxiliaries.c_commit = anonAuxiliaries.DR.add( proof.DPrime ).mul( BNFieldfromHex(proof.s_sk) ).add( anonAuxiliaries.CR[0][0].add( proof.CPrime).mul( BNFieldfromHex( proof.c) .redNeg() ) ).mul( zetherAuxiliaries.zs[0] ).add( anonAuxiliaries.CRnR.add( proof.CRnPrime ).mul( BNFieldfromHex(proof.s_sk) ).add( anonAuxiliaries.CLnR.add( proof.CLnPrime ). mul( BNFieldfromHex( proof.c) .redNeg() )).mul( zetherAuxiliaries.zs[1]));
        sigmaAuxiliaries.A_t = this.params.g.mul( zetherAuxiliaries.t ).add(  this.params.h.mul( BNFieldfromHex( proof.tauX ) )).add( zetherAuxiliaries.tEval.neg() ).mul( BNFieldfromHex( proof.c ).redMul(anonAuxiliaries.wPow)).add( sigmaAuxiliaries.c_commit );
        sigmaAuxiliaries.A_C0 = this.params.g.mul(  BNFieldfromHex( proof.s_vTransfer ) ).add( anonAuxiliaries.DR.mul( BNFieldfromHex( proof.s_sk )).add( anonAuxiliaries.CR[0][0].mul( BNFieldfromHex( proof.c).redNeg() )));
        sigmaAuxiliaries.A_CLn = this.params.g.mul( BNFieldfromHex( proof.s_vDiff ) ).add( anonAuxiliaries.CRnR.mul( BNFieldfromHex(proof.s_sk) ).add( anonAuxiliaries.CLnR.mul( BNFieldfromHex( proof.c).redNeg())));
        sigmaAuxiliaries.A_CPrime = this.params.h.mul( BNFieldfromHex( proof.s_nuTransfer) ).add( proof.DPrime.mul( BNFieldfromHex( proof.s_sk ) ).add( proof.CPrime.mul( BNFieldfromHex( proof.c ).redNeg())) ) ;

        sigmaAuxiliaries.A_CLnPrime = this.params.h.mul( BNFieldfromHex( proof.s_nuDiff )).add( proof.CRnPrime.mul( BNFieldfromHex( proof.s_sk )).add( proof.CLnPrime.mul( BNFieldfromHex( proof.c ).redNeg())));


        sigmaAuxiliaries.c = utils.hash(ABICoder.encodeParameters([
            'bytes32',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
            'bytes32[2]',
        ], [
            bn128.bytes(zetherAuxiliaries.x),
            bn128.serialize( sigmaAuxiliaries.A_y ),
            bn128.serialize( sigmaAuxiliaries.A_D ),
            bn128.serialize( sigmaAuxiliaries.A_u ),
            bn128.serialize( sigmaAuxiliaries.A_X ),
            bn128.serialize( sigmaAuxiliaries.A_t ),
            bn128.serialize( sigmaAuxiliaries.A_C0 ),
            bn128.serialize( sigmaAuxiliaries.A_CLn ),
            bn128.serialize( sigmaAuxiliaries.A_CPrime ),
            bn128.serialize( sigmaAuxiliaries.A_CLnPrime ),
        ]));

        this._commonVerifier.verify(proof, sigmaAuxiliaries, zetherAuxiliaries);

        return true;
    }



    assemblePolynomials(f) {

        const m = Math.floor( f.length / 2 );
        const N = Math.pow(2, m);

        const result = new Array( N );
        for (let i=0; i <result.length; i++)
            result[i] = new Array(2);

        for (let i = 0; i < 2; i++){

            const half =  this.recursivePolynomials(i * m, (i + 1) * m, 1, f);
            for (let j = 0; j < N; j++)
                result[j][i] = half[j];

        }

        return result;

    }

    recursivePolynomials (baseline, current, accum, f) {

        // have to do a bunch of re-allocating because solidity won't let me have something which is internal and also modifies (internal) state. (?)
        const size = Math.pow( 2, current - baseline ); // size is at least 2...
        const result = new Array( size );

        if (current == baseline) {
            result[0] = new BN(accum);
            if (!result[0].red) result[0] = result[0].toRed(bn128.q);
            return result;
        }

        current = current - 1;

        const left = this.recursivePolynomials(baseline, current, new BN(accum).toRed(bn128.q).redMul(f[current][0]), f);
        const right = this.recursivePolynomials(baseline, current, new BN(accum).toRed(bn128.q).redMul(f[current][1]), f);
        for (let i = 0; i < size / 2; i++) {
            result[i] = left[i];
            result[i + size / 2] = right[i];
        }

        return result;
    }

    assembleConvolutions(exponent, base) {
        // exponent is two "rows" (actually columns).
        // will return two rows, each of half the length of the exponents;
        // namely, we will return the Hadamards of "base" by the even circular shifts of "exponent"'s rows.
        const size = exponent.length;
        const half = size / 2;

        const result = new Array(half);
        for (let i=0; i < result.length; i++) {
            result[i] = new Array( 2 );
            for (let j=0; j < result[i].length; j++)
                result[i][j] = G1Point0();
        }

        const base_fft = this.fft1(base, false);

        let exponent_fft = new Array(size);
        for (let i=0; i <2; i++) {

            for (let j = 0; j < size; j++)
                exponent_fft[j] = exponent[(size - j) % size][i]; // convolutional flip plus copy


            exponent_fft = this.fft2(exponent_fft);

            let inverse_fft = new Array(half);
            let compensation = new BN(2).toRed( bn128.q );

            if (!compensation.red)
                compensation = compensation.toRed( bn128.q );

            compensation = compensation.redInvm();

            for (let j = 0; j < half; j++) // Hadamard
                inverse_fft[j] = base_fft[j].mul(exponent_fft[j]).add(base_fft[j + half].mul(exponent_fft[j + half])).mul(compensation);

            inverse_fft = this.fft1(inverse_fft, true);
            for (let j = 0; j < half; j++)
                result[j][i] = inverse_fft[j];

        }

        return result;
    }

    fft1(input, inverse) {

        const size = input.length;
        if (size == 1)
            return input;

        if (size % 2 === 1) throw "Input size is not a power of 2!";

        let omega = bn128.UNITY_MODULUS.toRed( bn128.q ).redPow(  new BN( Math.pow( 2, 28) /  size ) );
        let compensation = new BN(1);
        if (inverse) {
            omega = omega.redInvm();
            compensation = new BN(2);
        }
        compensation = compensation.toRed( bn128.q );
        compensation = compensation.redInvm();

        let even = this.fft1(this.extract1(input, 0), inverse);
        let odd = this.fft1(this.extract1(input, 1), inverse);

        let omega_run = new BN(1).toRed( bn128.q );
        let result = new Array(size);

        for (let i = 0; i < size / 2; i++) {
            const temp = odd[i].mul( omega_run);
            result[i] = even[i].add( temp).mul( compensation );
            result[i + size / 2] = even[i].add( temp.neg() ).mul( compensation ) ;
            omega_run = omega_run.redMul(omega);
        }

        return result;
    }

    extract1(input, parity) {

        const result = new Array( input.length / 2);
        for (let i = 0; i < input.length / 2; i++)
            result[i] = input[2 * i + parity];

        return result;

    }

    fft2(input) {

        const size = input.length;
        if (size == 1)
            return input;

        if (size % 2 === 1) throw "Input size is not a power of 2!";

        let omega = bn128.UNITY_MODULUS.toRed( bn128.q ).redPow(  new BN( Math.pow( 2, 28) /  size ) );

        const even = this.fft2(this.extract2(input, 0));
        const odd = this.fft2(this.extract2(input, 1));

        let omega_run = new BN(1).toRed( bn128.q );

        const result = new Array(size);
        for (let i = 0; i < size / 2; i++){
            const temp = odd[i].redMul(omega_run);
            result[i] = even[i].redAdd(temp);
            result[i + size / 2] = even[i].redSub(temp);
            omega_run = omega_run.redMul(omega);
        }

        return result;
    }

    extract2(input, parity) {
        const result = new Array(input.length / 2);
        for (let i = 0; i < input.length / 2; i++)
            result[i] = input[2 * i + parity];

        return result;
    }


}


module.exports = new ZVerifier();

