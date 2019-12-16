
class ZetherStatement {

    constructor(){

        this.CLn = [];
        this.CRn = [];
        this.C =  [];
        this.D = null;
        this.y = [];
        this.epoch = 0;
        this.u = null;

    }

    initializeBySize(size){

        this.CLn = new Array(size);
        this.CRn = new Array(size);
        this.C = new Array(size);
        this.y = new Array(size);

    }

    toJSON(){
        return {
            CLn: this.CLn.map(it => it.toJSON() ),
            CRn: this.CRn.map(it => it.toJSON() ),
            C: this.C.map(it => it.toJSON() ),
            D: this.D.toJSON(),
            y: this.y.map(it => it.toJSON() ),
            epoch: this.epoch,
            u: this.u.toJSON(),
        }
    }

}

module.exports = ZetherStatement;