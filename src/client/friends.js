class Friends {

    constructor() {
        this.friends = {};
    }

    add (name, pubkey) {
        // todo: checks that these are properly formed, of the right types, etc...
        this.friends[name] = pubkey;
        return "Friend added.";
    };

    show () {
        return this.friends;
    };

    remove (name) {

        if (!(name in this.friends))
            throw "Friend " + name + " not found in directory!";
        delete this.friends[name];
        return "Friend deleted.";

    };

}

module.exports = Friends;