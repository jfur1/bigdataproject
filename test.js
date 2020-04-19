// ------- Testing Area --------- //
const alpha = 0.02;  // Requested return percentage
const r = [0.024, 0.018, 0.009];
const r_t = math.transpose(r);
const e = [1, 1, 1];
const e_t = math.transpose(e);
const Q = [ [.0033, .00163, -.0007524], 
            [.00163, .00183, -.000563], 
            [-.0007524, -.000563, .001976] ];
const Q_inv = math.inv(Q);
console.log('Q Inverse: ', Q_inv);

const x_star_1 = math.multiply(Q_inv, r);
console.log("Chunk 1: ", x_star_1);

const x_star_2 = math.multiply(Q_inv, e);
console.log("Chunk 2: ", x_star_2);

// // ---- Solve for Lambdas ---- //
// //  [ [a, b],       [ [(r_t * Q_inv * r),  (r_t * Q_inv * e)],
// //     [b, d] ] =>    [(r_t * Q_inv * e),  (e_t * Q_inv * e) ] ] 
const a = math.multiply(r_t, Q_inv, r);
const b = math.multiply(r_t, Q_inv, e);
const d = math.multiply(e_t, Q_inv, e);
const A = [[a, b],
            [b, d]];
console.log("Matrix A: ", A);
const b_vec = math.matrix([.02, 1]);
console.log(b_vec.size())
const lambdas = math.lusolve(A, b_vec);
console.log("Lambda Values: ", lambdas);

// ---- Substitute Lambdas to solve for x_star ----- //
const new_chunk1 = x_star_1.map(function(x) {return x * lambdas[0]});
const new_chunk2 = x_star_2.map(function(x) {return x * lambdas[1]});
const x_star = math.add(new_chunk1, new_chunk2);

function optimize(Q, r, alpha){
    const r_t = math.transpose(r);
    const e = [1, 1, 1];
    const e_t = math.transpose(e);
    Q_inv = math.inv(Q);
    
    const x_star_1 = math.multiply(Q_inv, r);
    const x_star_2 = math.multiply(Q_inv, e);

    // // ---- Solve for Lambdas ---- //
    // //  [ [a, b],       [ [(r_t * Q_inv * r),  (r_t * Q_inv * e)],
    // //     [b, d] ] =>    [(r_t * Q_inv * e),  (e_t * Q_inv * e) ] ] 
    const a = math.multiply(r_t, Q_inv, r);
    const b = math.multiply(r_t, Q_inv, e);
    const d = math.multiply(e_t, Q_inv, e);
    const A = [[a, b],
                [b, d]];
    const b_vec = math.matrix([alpha, 1]);
    const lambdas = math.lusolve(A, b_vec);
    console.log("Lambda Values: ", lambdas);
    
    const new_chunk1 = x_star_1.map(function(x) {return x * lambdas[0]});
    const new_chunk2 = x_star_2.map(function(x) {return x * lambdas[1]});
    const x_star = math.add(new_chunk1, new_chunk2);
    return x_star;
}