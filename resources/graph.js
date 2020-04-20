module.exports = {
    renderChart: function(returns, variance){
        var ctx = document.getElementById("myChart").getContext("2d");
        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: [],
                    data: returns
                }]
            }
        })
    }
};