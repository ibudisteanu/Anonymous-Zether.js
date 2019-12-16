const Blockchain = require('./src/blockchain/blockchain');
const Client = require('./src/client/client');
const ZSC = require ('./src/js-contracts/zsc');


async function run(){

    const account = '0x620CB390Cd936a8E6de0270ed3254a0779475b4C';
    var alice = new Client( account );
    var bob = new Client( account );
    await alice.initialize();
    await bob.initialize();


    //deposit into alice
    setTimeout( async ()=> {

        await alice.deposit(1000);

    }, 5000);

    //
    //
    //
    // await alice.withdraw(10);
    // //await alice.withdraw(10);
    //
    // alice.friends.add("Bob", bob.account.public() );
    //
    // await alice.transfer("Bob", 100)
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
