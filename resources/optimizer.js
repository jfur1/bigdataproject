module.exports = class Portfolio {
    constructor(stock1, stock2, stock3, start, end, period, req_return, budget) {
        this.stock1 = stock1;
        this.stock2 = stock2;
        this.stock3 = stock3;
        this.start = start;
        this.end = end;
        this.period = period;
        this.req_return = req_return;
        this.budget = budget;
    }
}