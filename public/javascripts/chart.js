var svg = d3.select("svg"),
  margin = {top: 20, right: 100, bottom: 30, left: 100},
  width = +svg.attr("width") - margin.left - margin.right,
  height = +svg.attr("height") - margin.top - margin.bottom,
  // width = 800,
  // height = 600,
  g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var color = d3.scaleOrdinal()
  // .domain(["total", "active"])
  // .range(["rgba(236, 226, 218, 0.5)", "rgba(156, 179, 182, 0.5)"]);
  .domain(["total", "active_1w", "active_1m"])
  .range(["rgba(236, 226, 218, 0.5)", "rgba(156, 179, 182, 0.5)", "rgba(85, 114, 121, 0.5)"]);
  // .range(["rgba(234, 173, 77, 1)", "rgba(221, 120, 121, 1)", "rgba(180, 109, 165, 1)"]);

var x = d3.scaleLinear().range([0, width]),
  y = d3.scaleLinear().range([height, 0]),
  y2 = d3.scaleLinear().range([height, 0]),
  z = color;

var area = d3.area()
  .curve(d3.curveMonotoneX)
  .x(d => { return x(d.number); })
  .y0(y(0))
  .y1(d => { return y(d.value); });

// Right Y-axis
var valueline2 = d3.line()
    .x(d => { return x(d.number); })
    .y(d => { return y2(d.value); });

var formatValue = d3.format(".2s");

d3.json(period, (error, sources) => {
    if (error) throw error;

    console.log(sources);

    x.domain(d3.extent(sources[0]['values'], d => { return d.number; }));
    y.domain([
        0,
        d3.max(sources.slice(0, 3), c => { return d3.max(c.values, d => { return d.value; }); })
    ]);
    z.domain(sources.slice(0, 3).map(c => { return c.id; }));
    y2.domain([
      0,
      d3.max(sources.slice(3), c => { return d3.max(c.values, d => { return d.value; }); })
    ]);

    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x)
        .tickFormat(d => { return formatValue(d); })
      );

    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y).tickFormat(d => { return formatValue(d); }))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -10)
      .attr("y", 10)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      // .text("total, active");
      // .text("total, active_1w, active_1m");

    var source = g.selectAll(".area")
        .data(sources.slice(0, 3))
        .enter().append("g")
        .attr("class", d => { return `area ${d.id}`; })

    source.append("path")
        .attr("d", d => { console.log(area(d.values)); return area(d.values); })
        .style("fill", d => { return z(d.id); });

    // Add the valueline2 path.
    g.selectAll(".line")
      .data(sources.slice(3, 4))
      .enter()
      .append("path")
        .attr("fill", "none")
        // .attr("stroke", "rgba(233, 153, 144, 1)")
        .attr("stroke", "rgba(156, 179, 182, 0.5)")
        .attr("stroke-width", 1.5)
        .attr("d", function(d){
          return d3.line()
            .x(function(d) { return x(d.number); })
            .y(function(d) { return y2(+d.value); })
            .curve(d3.curveMonotoneX) // apply smoothing to the line
            (d.values)
        })

    g.selectAll(".line")
    .data(sources.slice(4))
    .enter()
    .append("path")
      .attr("fill", "none")
      // .attr("stroke", "rgba(233, 153, 144, 1)")
      .attr("stroke", "rgba(85, 114, 121, 0.5)")
      .attr("stroke-width", 1.5)
      .attr("d", function(d){
        return d3.line()
          .x(function(d) { return x(d.number); })
          .y(function(d) { return y2(+d.value); })
          .curve(d3.curveMonotoneX) // apply smoothing to the line
          (d.values)
      })

    // Add the y2 axis
    g.append("g")
      .attr("class", "axis axis--y2")
      .attr("transform", "translate( " + width + ", 0 )")
      .call(d3.axisRight(y2))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -55)
      .attr("y", 36)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .text("active / total");

    // Add legends
    g.append("circle").attr("cx",30).attr("cy",20).attr("r", 6).style("fill", "rgba(236, 226, 218, 0.5)")
    g.append("circle").attr("cx",30).attr("cy",40).attr("r", 6).style("fill", "rgba(156, 179, 182, 0.5)")
    g.append("circle").attr("cx",30).attr("cy",60).attr("r", 6).style("fill", "rgba(85, 114, 121, 0.5)")
    g.append("text").attr("x", 50).attr("y", 20).text("total").style("font-size", "12px").attr("alignment-baseline","middle")
    g.append("text").attr("x", 50).attr("y", 40).text("active 1m").style("font-size", "12px").attr("alignment-baseline","middle")
    g.append("text").attr("x", 50).attr("y", 60).text("active 1w").style("font-size", "12px").attr("alignment-baseline","middle")
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
