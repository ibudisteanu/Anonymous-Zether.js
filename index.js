const Blockchain = require('./src/blockchain/blockchain');
const Client = require('./src/client/client');
const ZSC = require ('./src/js-contracts/zsc');
const EpochWatcher = require('./src/utils/epoch-watcher');

async function run(){

    const account = '0x620CB390Cd936a8E6de0270ed3254a0779475b4C';

    var alice = new Client( account );
    var bob = new Client( account );
    var carol = new Client( account );
    var dave = new Client( account );
    var eve = new Client( account );

    await alice.initialize();
    await bob.initialize();
    await carol.initialize();
    await dave.initialize();
    await eve.initialize();

    /**
     * A => B, D, E
     * B => C
     */

    alice.friends.add("Bob", bob.account.public() );
    bob.friends.add("Carol", carol.account.public() );
    alice.friends.add("Dave", dave.account.public() );
    alice.friends.add("Eve", eve.account.public() );

    //deposit into alice
    Blockchain.onNewBlock = async ({block})=>{

        if (block.height === 1)
            await alice.deposit(1000);

        if (block.height === 10)
            await alice.withdraw(10);

        if (block.height === 20)
            await alice.transfer("Bob", 100);

        if (block.height === 30)
            await bob.withdraw(15);

        if (block.height === 40)
            await bob.withdraw(15);

        if (block.height === 50)
            await bob.transfer("Carol", 20);

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
