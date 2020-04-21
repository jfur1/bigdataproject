const math = require('mathjs');
module.exports = {
    optimize: function(Q, r, alpha){
        const r_t = math.transpose(r);
        const e = [1, 1, 1];
        const e_t = math.transpose(e);
        Q_inv = math.inv(Q);
        //console.log('Q Inverse: ', Q_inv);
    
        const x_star_1 = math.multiply(Q_inv, r);
        //console.log("Chunk 1: ", x_star_1);
        const x_star_2 = math.multiply(Q_inv, e);
        //console.log("Chunk 2: ", x_star_2);
    
        // // ---- Solve for Lambdas ---- //
        // //  [ [a, b],       [ [(r_t * Q_inv * r),  (r_t * Q_inv * e)],
        // //     [b, d] ] =>    [(r_t * Q_inv * e),  (e_t * Q_inv * e) ] ] 
        const a = math.multiply(r_t, Q_inv, r);
        const b = math.multiply(r_t, Q_inv, e);
        const d = math.multiply(e_t, Q_inv, e);
        const A = [[a, b],
                    [b, d]];
       // console.log("Matrix A: ", A);
        const b_vec = math.matrix([alpha, 1]);
        const lambdas = math.lusolve(A, b_vec);
        //console.log("Lambda Values: ", lambdas);
        
        const new_chunk1 = x_star_1.map(function(x) {return x * lambdas[0]});
        const new_chunk2 = x_star_2.map(function(x) {return x * lambdas[1]});
        const x_star = math.add(new_chunk1, new_chunk2);
        
        return x_star;
    },

    periodicReturns: function(prices){

        var returns = [];
        var pr0, pr1, ret;
        pr0 = prices[0].adjclose;
        for(i = 1; i < prices.length; i++){
            pr1 = prices[i].adjclose;
            ret = (pr1 - pr0) / pr0;
            ret = ret || 0;
            returns.push(ret);
            pr0 = pr1;
        }
        return returns; 
    },

    htmlDateToUnixTimestamp: function(htmlDate){
        //console.log(htmlDate);
        var d = htmlDate + 'T00:00:00.000Z';
        return new Date(d).valueOf()/1000;
    },

    periodicPrices: function(price_data){
        var prices = [];
        for(i = 0; i < price_data.length; i++){
            var price = price_data[i].adjclose;
            (typeof(price) != 'undefined') ? prices.push(price) : '';

        }
        return prices;
    },

    normalizeVectorLength: function(r_1, r_i){
        if(r_1.length != r_i.length){
            var delta = r_1.length - r_i.length;
            if(delta < 0){
                for(i = 0; i< math.abs(delta); i++){
                    r_1.push(0);
                }
            }
            else{
                for(i = 0; i < delta; i++){
                    r_i.push(0);
                }
            }
        }
        if(r_1.length != r_i.length){
            delta = r_1.length - r_i.length;
            if(delta < 0){
                for(i = 0; i < math.abs(delta); i++){
                    r_1.push(0);
                }
            }else{
                for( i = 0; i < delta; i++){
                    r_i.push(0);
                }
            }
        }
        return [r_1, r_i];
    }
};