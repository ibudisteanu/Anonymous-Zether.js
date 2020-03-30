const Blockchain = require('./src/blockchain/blockchain');
const Client = require('./src/client/client');
const ZSC = require ('./src/js-contracts/zsc');
const EpochWatcher = require('./src/utils/epoch-watcher');

async function run(){

    const blockchain = new Blockchain();

    const zsc = new ZSC(blockchain);

    const account = '0x620CB390Cd936a8E6de0270ed3254a0779475b4C';

    var alice = new Client( zsc, blockchain, account );
    var bob = new Client( zsc,blockchain, account );
    var carol = new Client( zsc, blockchain, account );
    var dave = new Client( zsc, blockchain, account );
    var eve = new Client( zsc, blockchain, account );

    await alice.register();
    await bob.register();
    await carol.register();
    await dave.register();
    await eve.register();

    /**
     * A => B, D, E
     * B => C
     */

    //deposit into alice
    blockchain.onNewBlock = async ({block})=>{

        if (block.height === 1)
            await alice.deposit(1000);

        if (block.height === 10)
            await alice.transfer( bob.account.public(), 100, 0);
            //await alice.withdraw(10 );

        if (block.height === 20)
            await alice.transfer( bob.account.public(), 100, 10);

        if (block.height === 30)
            await alice.withdraw(10);

        if (block.height === 40)
            await alice.transfer( bob.account.public(), 100, 5, [carol.account.public(), dave.account.public() ]);

        // if (block.height === 20)
        //     await alice.transfer("Bob", 100);
        //
        // if (block.height === 30)
        //     await bob.withdraw(15);
        //
        // if (block.height === 40)
        //     await bob.withdraw(15);
        //
        // if (block.height === 50)
        //     await bob.transfer("Carol", 20);

    };

    // console.log("transfer1");
    // await bob.transfer("Alice", 10, ["Carol", "Dave"]);
    // console.log("transfer2");
}


try{
    run();
}catch(err){
    console.error(err);
}
