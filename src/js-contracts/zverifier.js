const BN = require('bn.js');
const bn128 = require("./../utils/bn128");
const utils = require('./../utils/utils');
const ABICoder = require('web3-eth-abi');
const { FieldVector, GeneratorVector, AdvancedMath } = require('./../prover/algebra.js');

const G1Point = utils.G1Point;
const G1Point0 = utils.G1Point0;
const BNFieldfromHex = utils.BNFieldfromHex;

const ZetherProof = require('./../prover/schemas/zether-proof');
const ZetherStatement = require('./../prover/schemas/zether-statement');
const AnonAuxiliaries = require('./../prover/schemas/anon-auxiliaries');
const ZetherAuxiliaries = require('./../prover/schemas/zether-auxiliaries');
const SigmaAuxiliaries = require('./../prover/schemas/sigma-auxiliaries');

const CommonVerifier = require('./common-verifiers');

const FieldParams = require('./field-params');

const g_n = utils.g_n;
const g_m = utils.g_m;

class ZVerifier{

    constructor(){

        this.g = FieldParams.g;
        this.h = FieldParams.h;
        this.gs = FieldParams.gs;
        this.hs = FieldParams.hs;

        this._commonVerifier = new CommonVerifier( 'verifier', this.g, this.h, this.gs, this.hs, g_m, g_n);

    }

    verifyTransfer(CLn, CRn, C, D, y, epoch, u, proof){

        // CLn = [
        //     [
        //         "0x108bf5f39bf96d36e9caa2ccbaab0b0dd62aeda94b2722519cef96d12799cfd4",
        //         "0x160e9fc6c3c073dc95595e62e10efbf62ae0e61146f56dab8bd195f8c7247b6f"
        //     ],
        //     [
        //         "0x2f4b1fa6a7d80d6d530d53fb2e32f5e5ff769c210f45efc6ad4e10972dfd471e",
        //         "0x1a565b3fa0503e91751c11e505680ae3500f196a5dc5b53d6ec97e26f5aff6f7"
        //     ]
        // ]
        // CRn = [
        //     [
        //         "0x0438668a28645dfd799e3bf32124bde6920d98e8b4803ce7516b4e4b59424117",
        //         "0x0ca944da93d84835f3d233ce6f8fe26d03d358b95ec167d17f6788dcac25a5d1"
        //     ],
        //     [
        //         "0x0438668a28645dfd799e3bf32124bde6920d98e8b4803ce7516b4e4b59424117",
        //         "0x0ca944da93d84835f3d233ce6f8fe26d03d358b95ec167d17f6788dcac25a5d1"
        //     ]
        // ]
        // C = [
        //     [
        //         "0x184c66663a81a05340d0fe06426ee240dbefafcf5d712de17e458ba608a69cb4",
        //         "0x25247377540d084eae3396d9f2c7406c0b1c0691de79d518b74743f786c9ae2a"
        //     ],
        //     [
        //         "0x2f4b1fa6a7d80d6d530d53fb2e32f5e5ff769c210f45efc6ad4e10972dfd471e",
        //         "0x160df33340e16198433433d17c194d7a477251270aac154fcd570defe2cd0650"
        //     ]
        // ]
        // D = [
        //     "0x0438668a28645dfd799e3bf32124bde6920d98e8b4803ce7516b4e4b59424117",
        //     "0x23bb09984d5957f3c47e11e811f175f093ae11d809b062bbbcb9033a2c575776"
        // ]
        // y = [
        //     [
        //         "0x2ba8274709b406410d351392d746c32d7bb5f267c48e312b1754b9f3800eaa72",
        //         "0x197d59dbb049ad6c885c69ce069c43d5a735db00296d79415c57edc38f916bce"
        //     ],
        //     [
        //         "0x00a7cb5578c41307754d99b4c6d934a9b90d9451d3b2bb566be4903e42d31a9c",
        //         "0x2ea8c6f6d4bd37f476726264e7540b80951d7374fb6c1e8057d19004666078cd"
        //     ]
        // ]
        // epoch = 262740342;
        // u = [
        //     "0x0c911b8a8156e5547e5c8343b20d49b0b8bdb8f1beadc4e982d9350966eaf10e",
        //     "0x16de0f25be37319cfa367ec6f97c183ad765d45e76b4f6f2e3dd3d923fe4c81c"
        // ];
        //proof = "0x0591b5073ab476df84d5f4b64c584ec5aac8cb329686dde672f0707fc58cdcb92d5c5fc0cc22c8a7e2165d46f7948e2104415fcde47e4ba0825346066186a5d40c221c75894f2465ef88dae42d3ce696654e0ea1284a2ae93312e044d1f18dda2ae00f08c1b7270f2d2d5a290c3c402b1940cde9d91945842ae742cfd13dc6051906dab7c1ebebd4a96a4e2b2fc37f112311b21f2246852090fadb8ba22964ac2a29ec8f02ec43cbfe33a0c66fd23d2f6e4db25165a233c6d8e549b48e8f7fc92eb0f635b2f8174d8b647671122b738c896d86fc139e77b3da30e203862e7f780c0d1f5174eeaf4e6d3f902bab6595520a8cb992c2882a257b6e803e88e4cd2f1c6f298078efc6712d76b1c02fc7f3003a8ef7c7e9aae9ca067e24679a9e798118b5800911f9c370d1dfc58fba594a2d4b7d0b87e970e5fa8d7b0b848a7b36031a19dbf5b5cd38bb6296802260e622d0efbf6727a0906ba06448350386dc8a010b30af6b8040326cf0e3d403626edd612babc951c22fa222562e347fd64e99bf19078223c702b2b20b188b3bac4dd8245eea76564f87763a497060fd85f9e55a1f342a9ed845264572508b76eaf7e9e707adee71532477d6c1da19e8d8b1bdf70d651feaedfae7961aa55229343baa337f60eb913fb5984d4f7ad35adab6163c21c65eaa234360c954f38651351211391a8d790a202840e45e61518ab39d12171ee0e5916f4729b4803474f6933e082c6b6669407579841a21d3281e6f92872e1c384774a9edf52268cf164f91f5f2333869b4e11feb8fe828493f545eef9a952480b08f8da771469e1f0b3467062741e86994e1a22b3a22fd37fa3459f011fd14a487755c493f37a12ff2218c18056c0168d5a5e1eba962e2e3cc7cc077e4d620115971a32d0bbea1451a4f0d5e8907254e2f09abd1488ae17d5b568a71a8642bbca8204fd2fdb7d1b4f3b4ee05c88fb1256c3c297007da0103699d9e96c16621f969fd70a093be7399ae2fc4853a7274b62f04eb3bddb69efcb69a85bfbc822106f5720239bb5d01097dee7185fd50a27b620bf2ea226569444be6d15903141480e6473e8698aea3d3c10840cfebfaa9de64a33989931112397e22f809977204b80952e06e0a09ddd9f37015117d60d6131cf6098012325f23ba3648b114f507bb4750dd4d226c171e22f7ed2ffea01363880daee5d4a4c7adee05fbb6d43119fa2ef3c3b07b769b7a4559fab9eb93c3cf2a7880b62d79fe1f7618d87a39fc1317a24738fe088d49af06a809cfec64b6ea2fca0c0421a93a87216fcf1597d62bb7f926647ca97f86ecf816409fd35cf5ed2f3bf1843b57f49b419c87a10f8c2db3cfa8760cd816d096fa909e591e152e32de56f74e18901b09f7d6370b13132f627c19cce847543800cafa7601a2976cff0aae7a5b345b7f621e375551a09b2c86ccbe0aa86068492f030e7398013c2751e9d07c2a32d30b74edcb125c45e813f85a32c717d03bf96f9b07bbdff5585d715184ae50803d21d93e016544f8bf24464501b84c17eedcad10f847271a45064e4b412c74cd0481cbf12fc8b87b9a297b4cd899c1f90b0642f899a1356245df7d812259822314097547b106586f000210e024c8d87cdebf86b079258d21a85ae0b1c9d83cf35beaf704f44fb019dd1536fdf9bdcb13bccc10db09ee94087bab2f5014ff877d579f46df18db7a25fc230c471006efd155a1d652ac24bc9bf7e5dfa4b3b45d92b2873a34c3ef4599ed0183cae066c81a0345ee5bb149e60bf1af8d43af13f722fae06f23d1e99b7eea21a270c3d3ea3bc86179480bc92a3a947de262cd205e44d082b8e7f8655124952f9742ca1b83ac95802f9299fb6869d53f4522bbe53654210aa6d6bdc302d1c82d600918608b7e774a95787abeec949fa0b139940020be92f93d68ef181cbcd22a7cbe5605fcb9b60e16bb78f75cee7f5ce742ccd2581bed2546670c8f2e344825796c3fa3a4e00f1c16bd25b6115eda2ce1ab51c8aa3878b136564fb18568c609d515a60ee7994a637668a31b50acb48964506f701882bda6e81bd410817f7b07fbd996e96c3385ed3298609ba838613cca331c05a9afa99058f892da6280712ee98cd9e1c9a8fca7d0378d3ef5b0e21ba2bd3ffdbd9bfd3df6a71dc34bfdb30709fba94d7c55e5ed1bb77a326d01e671a65eb30b3a3315ecfe2dc71511ba75290aaf2a2dc40329295527c90bb4b0b715d5e44ad0e0dba1e1d895c32cc849671e5a84b3c74a927c7f12ed30be7654e602a85c65749449116db9d026fe7535db237ab473ad50bde36999281987a2884720420bf87b2287bc3446bd3376cca0f11a47d36b92b247a0a648b974985f0e8bd8bf435ab189e92d7dd7c13378d585a228279456edafc135a504b66c77ad525864fe0be24437c41757da57ae6e985a1a091d55b312f2bac050ecb371faa0ce13bcf9469378083c555e861e11dcb66cef098be9929f27ac30451e806587b2cf63c38443a69701a0ba9b14d6b03149fb5e30057f708ae7918e948c879db693ed82017ba235c38e6eb03c08f7551c9fc0bb12360d1367cc12b28068a0895b6ddd72a336208b469c3f4fdbb39bcdf98623110a72c4a7b035f8b52568ef11a79fbfee26a08005d6068b313057ac8d70d8830e2ec370580cec354ea9e4bcb226af5819b30b751bf500a5161069ea0c14b7a46300d8b0f49170a3c0681662b529fc595645c6f323462f500104ab9e1e2ce5af0e2651b8b4735f045a34e38647505d665226da0f878f8357c12ebd704dad334f422f6f4143b3e6dfe00ef82df6317dc99169a334c8e0e2244ec1600879e56932cb23c0191dbe0a86eac9fb7281174052265646323df5e94e18be8046a1ffb9526e302a95fdb3d2a443ca6ef8bd1033e47fcca467ccf12dbbd4f021d602158c6f9c0fffa95027754d4a3a38d527a32ceafc59cc7839b858163a6c07529222985ce72a7ad0cb43c1dbf6ce1d6dadfe6add7d9dfdbbb1a8c5e1f70b05cde5c50a9c4727b1239b621647191968a3e087bad540102a2d8e64812cbfae94adb2c3dd83c30b6a1f2c79f985d5b90a6f3939d4312b4be06286c4ca70ad8d1a2bd25020464812a48de9e27d8e0a82f951a9a2f024d69facb2d915fca580ce46a3928694081315d06374299bb4ebe0c8f12250476443797fcf91d17c6ac4fe7682ecf74dcc9905b2bb84d0c543d6e11d93e2008a6ee455fa9bcab928ead7fb383c3fa858d99f29e309bd424d55bb6a5b954b7b2b573c8dd87c8641a976e8c80e62a3cb8a31da06d14a889bda85e21662a2c5e081a01b34b2cdca2de26ebe0cd980359549f6fd0a306e18e14577054857db16ece281089d360309b8ed7ccaf3afc76342347ea8192a9345f32463d5ebcc60dba8cbd72f553014e431d85e5fa1d47b0d0ec7952c1db4626c031b8b97275934b143cc1d9e1c07f0fa80339f73b1b6ab265e4100d5102c04da904d9e2fa326a28beb0d34da68802804f47df9164986d3c63884bfa012a8a0302cbe687ef21c8eabb607e0487135aa4d431e3d9f1ac06c24168713a61081b05872956e8cdf46db09061bef94cd5e1bdff46b743d0c928d3541461b5c2d63ded8b6bb7d859ff03738bd84290068e6799833986c6432fb50417da0c9812e9c017340e3ed084aaf01adadcf635c6c1b2d30733bd79b9de215054cd1739716008420364a99f677df2d2aaa09f3a934f211646df321a9e8be80b8bf897ccf27abbf0f54901648d6ad7ab1e55be72fb749af1e3468e9bca2fb7d885d0f8f0001c3479f328f3affd56dd3eb39a00287688a7a68250d0a65a9023aab6d9fe9d1";


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
        anonAuxiliaries.d = utils.hash(ABICoder.encodeParameters([
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
            proof.A.serialize(),
            proof.S.serialize(),
            proof.P.serialize(),
            proof.Q.serialize(),
            proof.U.serialize(),
            proof.V.serialize(),
            proof.X.serialize(),
            proof.Y.serialize(),
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
            bn128.bytes(anonAuxiliaries.d),
            proof.CLnG.map(bn128.serialize),
            proof.CRnG.map(bn128.serialize),
            proof.C_0G.map(bn128.serialize),
            proof.y_0G.map(bn128.serialize),
            proof.C_XG.map(bn128.serialize),
            proof.y_XG.map(bn128.serialize),
            proof.DG.map(bn128.serialize),
            proof.gG.map(bn128.serialize),
        ]));


        anonAuxiliaries.m = Math.floor( proof.f.length / 2 ) ; //!!! FLOOR
        anonAuxiliaries.N = Math.pow(2, anonAuxiliaries.m );

        anonAuxiliaries.f = new Array( 2 * anonAuxiliaries.m );

        for (let i=0; i < anonAuxiliaries.f.length; i++) {
            anonAuxiliaries.f[i] = new Array(2);
            anonAuxiliaries.f[i][1] = BNFieldfromHex( proof.f[i] );
            anonAuxiliaries.f[i][0] = anonAuxiliaries.w.redSub(  BNFieldfromHex(proof.f[i]) );
        }


        anonAuxiliaries.temp = G1Point0();
        for (let i=0; i < 2 * anonAuxiliaries.m; i++) {
            anonAuxiliaries.temp = anonAuxiliaries.temp.add(  this.gs[i].mul( anonAuxiliaries.f[i][0]) ) ;
            anonAuxiliaries.temp = anonAuxiliaries.temp.add(  this.hs[i].mul( anonAuxiliaries.f[i][1]) ) ;
        }

        if (proof.Q.mul(anonAuxiliaries.w).add(proof.P).eq( anonAuxiliaries.temp.add( this.h.mul(  BNFieldfromHex( proof.z_P)) ) ) === false) throw "Recovery failure for Q^w * P.";


        anonAuxiliaries.temp = G1Point0();
        for (let i = 0; i < 2 * anonAuxiliaries.m; i++) { // danger... gs and hs need to be big enough.
            anonAuxiliaries.temp = anonAuxiliaries.temp.add( (this.gs[i].mul( anonAuxiliaries.f[i][0].redMul( anonAuxiliaries.w.redSub( anonAuxiliaries.f[i][0])))) );
            anonAuxiliaries.temp = anonAuxiliaries.temp.add( (this.hs[i].mul( anonAuxiliaries.f[i][1].redMul( anonAuxiliaries.w.redSub( anonAuxiliaries.f[i][1])))) );
        }

        if ( proof.U.mul(anonAuxiliaries.w).add(proof.V).eq( anonAuxiliaries.temp.add( this.h.mul(  BNFieldfromHex( proof.z_U) ) ) )  === false ) throw "Recovery failure for U^w * V.";

        anonAuxiliaries.temp = this.gs[0].mul( anonAuxiliaries.f[0][0].redMul(anonAuxiliaries.f[anonAuxiliaries.m][0])).add( this.hs[0].mul( anonAuxiliaries.f[0][1].redMul(anonAuxiliaries.f[anonAuxiliaries.m][1])));

        if ( proof.Y.mul( anonAuxiliaries.w ).add( proof.X ).eq( anonAuxiliaries.temp.add( this.h.mul(  BNFieldfromHex( proof.z_X ) )  ) ) === false ) throw "Recovery failure for Y^w * X.";

        anonAuxiliaries.poly = this.assemblePolynomials(anonAuxiliaries.f);

        anonAuxiliaries.CR = this.assembleConvolutions(anonAuxiliaries.poly, statement.C);
        anonAuxiliaries.yR = this.assembleConvolutions(anonAuxiliaries.poly, statement.y);

        anonAuxiliaries.CLnR = G1Point0();
        anonAuxiliaries.CRnR = G1Point0();
        for (let j = 0; j < anonAuxiliaries.N; j++) {
            anonAuxiliaries.CLnR = anonAuxiliaries.CLnR.add( statement.CLn[j].mul( anonAuxiliaries.poly[j][0]));
            anonAuxiliaries.CRnR = anonAuxiliaries.CRnR.add( statement.CRn[j].mul( anonAuxiliaries.poly[j][0]));
        }
        anonAuxiliaries.dPow = new BN(1).toRed(bn128.q);
        anonAuxiliaries.C_XR = G1Point0();
        anonAuxiliaries.y_XR = G1Point0();
        for (let j = 0; j < anonAuxiliaries.N; j++) {
            anonAuxiliaries.C_XR = anonAuxiliaries.C_XR.add( anonAuxiliaries.CR[ Math.floor(j / 2) ][j % 2].mul( anonAuxiliaries.dPow));
            anonAuxiliaries.y_XR = anonAuxiliaries.y_XR.add(anonAuxiliaries.yR[  Math.floor(j / 2) ][j % 2].mul( anonAuxiliaries.dPow));
            if (j > 0)
                anonAuxiliaries.dPow = anonAuxiliaries.dPow.redMul(anonAuxiliaries.d);

        }
        anonAuxiliaries.wPow = new BN(1).toRed(bn128.q);
        anonAuxiliaries.DR = G1Point0();
        anonAuxiliaries.gR = G1Point0();
        for (let i = 0; i < anonAuxiliaries.m; i++) {
            anonAuxiliaries.CLnR = anonAuxiliaries.CLnR.add( proof.CLnG[i].mul( anonAuxiliaries.wPow.redNeg() ));
            anonAuxiliaries.CRnR = anonAuxiliaries.CRnR.add( proof.CRnG[i].mul( anonAuxiliaries.wPow.redNeg() ));
            anonAuxiliaries.CR[0][0] = anonAuxiliaries.CR[0][0].add( proof.C_0G[i].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.yR[0][0] = anonAuxiliaries.yR[0][0].add( proof.y_0G[i].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.C_XR = anonAuxiliaries.C_XR.add( proof.C_XG[i].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.y_XR = anonAuxiliaries.y_XR.add( proof.y_XG[i].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.DR = anonAuxiliaries.DR.add( proof.DG[i].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.gR = anonAuxiliaries.gR.add( proof.gG[i].mul( anonAuxiliaries.wPow.redNeg()));
            anonAuxiliaries.wPow = anonAuxiliaries.wPow.redMul(anonAuxiliaries.w);
        }
        anonAuxiliaries.gR = anonAuxiliaries.gR.add( this.g.mul( anonAuxiliaries.wPow));
        anonAuxiliaries.DR = anonAuxiliaries.DR.add( statement.D.mul( anonAuxiliaries.wPow));

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
            '0x'+zetherAuxiliaries.y.toString("hex"),
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
            '0x'+zetherAuxiliaries.z.toString(16),
            proof.tCommits.map( bn128.serialize ),
        ]));

        zetherAuxiliaries.tEval = proof.tCommits[0].mul ( zetherAuxiliaries.x ).add( proof.tCommits[1].mul( zetherAuxiliaries.x.redMul(zetherAuxiliaries.x) )); // replace with "commit"?

        const sigmaAuxiliaries = new SigmaAuxiliaries();
        sigmaAuxiliaries.A_y = anonAuxiliaries.gR.mul( BNFieldfromHex( proof.s_sk ) ).add( anonAuxiliaries.yR[0][0].mul( BNFieldfromHex(proof.c).redNeg() ));
        sigmaAuxiliaries.A_D = this.g.mul( BNFieldfromHex(proof.s_r ) ).add( statement.D.mul( BNFieldfromHex( proof.c ) .redNeg()));
        sigmaAuxiliaries.gEpoch = utils.gEpoch( statement.epoch ) ;

        sigmaAuxiliaries.A_u = sigmaAuxiliaries.gEpoch.mul( BNFieldfromHex( proof.s_sk ) ).add( statement.u.mul( BNFieldfromHex( proof.c ).redNeg()  ));


        sigmaAuxiliaries.A_X = anonAuxiliaries.y_XR.mul( BNFieldfromHex( proof.s_r) ).add( anonAuxiliaries.C_XR.mul( BNFieldfromHex( proof.c) .redNeg()  ) ) ;

        sigmaAuxiliaries.c_commit = anonAuxiliaries.DR.add( proof.DPrime ).mul( BNFieldfromHex(proof.s_sk) ).add( anonAuxiliaries.CR[0][0].add( proof.CPrime).mul( BNFieldfromHex( proof.c) .redNeg() ) ).mul( zetherAuxiliaries.zs[0] ).add( anonAuxiliaries.CRnR.add( proof.CRnPrime ).mul( BNFieldfromHex(proof.s_sk) ).add( anonAuxiliaries.CLnR.add( proof.CLnPrime ). mul( BNFieldfromHex( proof.c) .redNeg() )).mul( zetherAuxiliaries.zs[1]));
        sigmaAuxiliaries.A_t = this.g.mul( zetherAuxiliaries.t ).add(  this.h.mul( BNFieldfromHex( proof.tauX ) )).add( zetherAuxiliaries.tEval.neg() ).mul( BNFieldfromHex( proof.c ).redMul(anonAuxiliaries.wPow)).add( sigmaAuxiliaries.c_commit );
        sigmaAuxiliaries.A_C0 = this.g.mul(  BNFieldfromHex( proof.s_vTransfer ) ).add( anonAuxiliaries.DR.mul( BNFieldfromHex( proof.s_sk )).add( anonAuxiliaries.CR[0][0].mul( BNFieldfromHex( proof.c).redNeg() )));
        sigmaAuxiliaries.A_CLn = this.g.mul( BNFieldfromHex( proof.s_vDiff ) ).add( anonAuxiliaries.CRnR.mul( BNFieldfromHex(proof.s_sk) ).add( anonAuxiliaries.CLnR.mul( BNFieldfromHex( proof.c).redNeg())));
        sigmaAuxiliaries.A_CPrime = this.h.mul( BNFieldfromHex( proof.s_nuTransfer) ).add( proof.DPrime.mul( BNFieldfromHex( proof.s_sk ) ).add( proof.CPrime.mul( BNFieldfromHex( proof.c ).redNeg())) ) ;

        sigmaAuxiliaries.A_CLnPrime = this.h.mul( BNFieldfromHex( proof.s_nuDiff )).add( proof.CRnPrime.mul( BNFieldfromHex( proof.s_sk )).add( proof.CLnPrime.mul( BNFieldfromHex( proof.c ).redNeg())));


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

