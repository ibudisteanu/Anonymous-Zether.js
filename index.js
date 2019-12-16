const Blockchain = require('./src/blockchain/blockchain');
const Client = require('./src/client/client');
const ZSC = require ('./src/js-contracts/zsc');


async function run(){

    const account = '0x620CB390Cd936a8E6de0270ed3254a0779475b4C';
    var alice = new Client( account );
    var bob = new Client( account );
    await alice.initialize();
    await bob.initialize();

    alice.friends.add("Bob", bob.account.public() );

    //deposit into alice
    Blockchain.events.on('new-block',async ({block})=>{

        if (block.height === 1)
            await alice.deposit(1000);

        if (block.height === 10)
            await alice.withdraw(10);

        // if (block.height === 10)
        //     await alice.transfer("Bob", 100)


    });

    // //await alice.withdraw(10);
    //

    //
    //
    // console.log("transfer1");
    // await bob.transfer("Alice", 10, ["Carol", "Dave"]);
    // console.log("transfer2");
}


try{
    run();
}catch(err){
    console.error(err);
}
