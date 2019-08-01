var svg = d3.select("svg"),
  margin = {top: 20, right: 100, bottom: 30, left: 100},
  width = +svg.attr("width") - margin.left - margin.right,
  height = +svg.attr("height") - margin.top - margin.bottom,
  g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var color = d3.scaleOrdinal()
  .domain(["total", "active", "puppet"])
  .range(["rgba(236, 226, 218, 1)", "rgba(156, 179, 182, 1)", "rgba(85, 114, 121, 1)"]);

var x = d3.scaleLinear().range([0, width]),
  y = d3.scaleLinear().range([height, 0]),
  z = color;

var area = d3.area()
.curve(d3.curveMonotoneX)
.x(d => { return x(d.number); })
.y0(y(0))
.y1(d => { return y(d.value); });


d3.json("/data", (error, sources) => {
    if (error) throw error;

    console.log(sources);

    x.domain(d3.extent(sources[0]['values'], d => { return d.number; }));
    y.domain([
        0,
        d3.max(sources, c => { return d3.max(c.values, d => { return d.value; }); })
    ]);
    z.domain(sources.map(c => { return c.id; }));

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .text("total, active, puppet");

    var source = g.selectAll(".area")
        .data(sources)
        .enter().append("g")
        .attr("class", d => { return `area ${d.id}`; })

    source.append("path")
        .attr("d", d => { console.log(area(d.values)); return area(d.values); })
        .style("fill", d => { return z(d.id); });
});

// var parseDate = d3.timeParse("%Y/%m/%d %H:%M");

// d3.csv("kW_zoomed.csv", type, function(error, data) {
//     if (error) throw error;

//     var sources = data.columns.slice(1).map(function(id) {
//       return {
//         id: id,
//         values: data.map(function(d) {
//           return {date: d.date, kW: d[id]};
//         })
//       };
//     });

//     console.log(sources);

//     console.log(d3.extent(data, function(d) { return d.date; }));
//     console.log([
//         0,
//         d3.max(sources, function(c) { return d3.max(c.values, function(d) { return d.kW; }); })
//       ]);
//     console.log(sources.map(function(c) { return c.id; }));

//     x.domain(d3.extent(data, function(d) { return d.date; }));
//     y.domain([
//       0,
//       d3.max(sources, function(c) { return d3.max(c.values, function(d) { return d.kW; }); })
//     ]);
//     z.domain(sources.map(function(c) { return c.id; }));

//     g.append("g")
//         .attr("class", "axis axis--x")
//         .attr("transform", "translate(0," + height + ")")
//         .call(d3.axisBottom(x));

//     g.append("g")
//         .attr("class", "axis axis--y")
//         .call(d3.axisLeft(y))
//       .append("text")
//         .attr("transform", "rotate(-90)")
//         .attr("y", 6)
//         .attr("dy", "0.71em")
//         .attr("fill", "#000")
//         .text("Power, kW");

//     var source = g.selectAll(".area")
//         .data(sources)
//         .enter().append("g")
//         .attr("class", function(d) { return `area ${d.id}`; })

//     source.append("path")
//          .attr("d", function(d) { console.log(area(d.values)); return area(d.values); })
//          .style("fill", function(d) { return z(d.id); });
//   });

// function type(d, _, columns) {
//     d.date = parseDate(d.date);
//     for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
//     return d;
//   }
