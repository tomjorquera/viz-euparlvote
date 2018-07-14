function parlayout(svg, width, data) {
  return new Promise(function(resolve, reject) { 
    const margin = 0;
    const height = width / 2;

    svg.attr('width', width);
    svg.attr('height', height);

    const seatClasses = 'seat';

    svg.each(function() {
      let container = svg.select('.parliament');
      if (container.empty()) {
        container = svg.append('g');
        container.classed('parliament', true);
      }

      const seats = container.selectAll('circle').data(data, d => d.seat);

      const absoluteX = x => x * width;
      const absoluteY = y => y * (height - margin) + margin;

      seats.enter()
        .append('g')
        .attr('class', seatClasses)
        .attr('transform', d => `translate(${absoluteX(d.x)}, ${absoluteY(d.y)})`)
        .append('circle')
        .attr('class', seatClasses)
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 4);
    });

    resolve();
  });
}
