'use strict';

const parliament_left_to_right = [
  'GUE/NGL',
  'S&D',
  'Greens/EFA',
  'ALDE',
  'EPP',
  'ECR',
  'EFDD',
  'ENF',
  'NI'
];

const parliament_colors = {
  'GUE/NGL': '#990000',
  'S&D': '#F0001C',
  'Greens/EFA':'#99CC33',
  'ALDE': '#FFD700',
  'EPP': '#3399FF',
  'ECR': '#0054A5',
  'EFDD': '#24B9B9',
  'ENF': '#2B3856',
  'NI': '#C0C0C0',
}

const position_top_to_bottom = [
  'For',
  'Against',
  'Neutral'
];

function parl_graph(vote_data) {

  const svg = d3.select('svg');

  d3.json("./layout-stra.json").then(
    layout => parlayout(svg, 800, layout)
  ).then(() => {
    const data_parl = [];
    for (const group of parliament_left_to_right) {
      const data_group = {
        id: group,
        seats: [],
      };

      for (const position of position_top_to_bottom) {
        const filtered_data = vote_data.filter(d => d['group'] == group &&
                                               d['position'] == position);

        if (filtered_data) {
          for (const entry of filtered_data) {
            data_group.seats.push(entry);
          }
        }
      }

      data_parl.push(data_group);
    }

    const circles =d3.selectAll('circle').filter('.seat').each(function(e){
      this.classList.add('seatDisplay');
    });

    const seats_circles = d3.selectAll('g').filter('.seat').data(vote_data, d => d.seat);

    seats_circles.each(function(e) {
      this.classList.add(e.position);
    });

    // seats tooltips
    seats_circles.append("svg:title").text(d =>  d['group'] + ' ' + d['first_name']
                                           + ' ' + d['last_name'] + ': ' + d['position']);

    function draw_indicator(e) {
      let svg;
      if(e['position'] == 'For') {
        // draw +
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.setAttributeNS(null, 'd', `M${-1.2} ${-2.8} h2 v2 h2 v2 h-2 v2 h-2 v-2 h-2 v-2 h2 z`);
      } else if (e['position'] == 'Against') {
        // draw -
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.setAttributeNS(null, 'd', `M${-1.7} ${-1} h4 v2 h-4 v-2 z`);
      } else {
        // draw o
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        svg.setAttributeNS(null, 'fill', 'black');
        svg.setAttributeNS(null, "cx", 0);
        svg.setAttributeNS(null, "cy", 0);
        svg.setAttributeNS(null, "r", 2);
      }

      svg.setAttribute('class', 'seatDecorator');

      const tooltip = document.createElementNS('http://www.w3.org/2000/svg','title');
      tooltip.innerHTML = e['group'] + ' ' + e['first_name'] + ' ' + e['last_name'] + ': ' + e['position'];
      svg.appendChild(tooltip);

      this.append(svg);
    }

    d3.selectAll('g').filter('.seat').data(vote_data, d => d.seat).each(draw_indicator);
    d3.selectAll('g').filter('.seat').filter(function(x) {}).data(vote_data, d => d.seat).each(draw_indicator);

  });
}

load_data(function(data) {
  const vote_data = data.filter(d => d['vote'] == 'A8 - 0245/2018 - Axel Voss - Décision d\'engager des négociations interinstitutionnelles');

  const positions = unique(get(vote_data, 'position'));
  const group = unique(get(vote_data, 'group'));

  const select_position = new SlimSelect({
    select: '#position-select',
    showSearch: false,
    closeOnSelect: false,
  });

  const select_group = new SlimSelect({
    select: '#group-select',
    showSearch: true,
    closeOnSelect: false,
  });

  select_position.setData(positions.map(text => ({ text })));
  select_position.set(positions);

  select_group.setData(group.map(text => ({ text })));
  select_group.set(group);

  const all_meps = unique(get(vote_data, 'last_name')).sort();
  const select_mep = new SlimSelect({
    select: '#mep-select',
    showSearch: true,
    closeOnSelect: true,
    placeholder: 'Select or search members'
  });

  select_mep.setData(select_mep.data.data.concat(all_meps.map(text => ({text}))));

  select_position.onChange = filter_data(select_position, select_group, select_mep, vote_data);
  select_group.onChange = filter_data(select_position, select_group, select_mep, vote_data);
  select_mep.onChange = filter_data(select_position, select_group, select_mep, vote_data);

  update_charts(vote_data);

  parl_graph(vote_data);
});


function filter_data(select_position, select_group, select_mep, vote_data_orig) {
  return () => {
    // clone vote data
    let vote_data = clone(vote_data_orig);

    const selected_positions = select_position.selected();
    const selected_groups = select_group.selected();

    const selected_meps = select_mep.selected();

    if (selected_meps.length > 0 ) {
      select_position.disable();
      select_group.disable();

      vote_data = vote_data.filter(d => selected_meps.includes(d['last_name']));
    } else {
      select_position.enable();
      select_group.enable();

      vote_data = vote_data.filter(d => selected_positions.includes(d['position']));
      vote_data = vote_data.filter(d => selected_groups.includes(d['group']));
    }

    update_charts(vote_data);
    update_parl(selected_positions, selected_groups, selected_meps);
  };
}

function update_parl(positions, groups, meps) {
  d3.selectAll('g').filter('.seat').each(function(e) {
    if (meps.length > 0) {
      if (meps.includes(e['last_name'])) {
        this.classList.remove('disabled');
      } else {
        this.classList.add('disabled');
      }
    } else {
      if (positions.includes(e['position']) && groups.includes(e['group'])){
        this.classList.remove('disabled');
      } else {
        this.classList.add('disabled');
      }
    }
  });
}

function update_charts(vote_data) {
  const count_by_pos_by_group = aggr(groupby(vote_data, 'group'),
                                     d => aggr(groupby(d, 'position'), l => l.length));
  const count_by_group_by_pos = aggr(groupby(vote_data, 'position'),
                                     d => aggr(groupby(d, 'group'), l => l.length));


  const pos_group_plot_data = format_to_plot(count_by_pos_by_group);
  pos_group_plot_data.forEach(e => e['marker'] = {
    'color': parliament_colors[e.name]
  });

  create_bar_chart(document.getElementById('by_group'), 'Positions',
                   pos_group_plot_data);
  create_bar_chart(document.getElementById('by_position'), 'Groups',
                   format_to_plot(count_by_group_by_pos));

}

function create_bar_chart(body_element, title, bar_data) {
  Plotly.newPlot(body_element, bar_data, {
    barmode: 'stack',
    title: title,
    xaxis: { fixedrange: true }, // disable zoom
    yaxis: { fixedrange: true }, // disable zoom
    margin: { t: 35 }
  }, {
    displayModeBar: false
  });
  // disable click on legend
  body_element.on('plotly_legendclick',function() { return false; });
}

function load_data(callback) {
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      callback(JSON.parse(this.responseText));
    }
  };
  xmlhttp.open('GET', './EP_votes.json', true);
  xmlhttp.send();
}

function format_to_plot(data, type='bar') {
  const res = [];

  const level_0 = Object.keys(data);
  for (const level_0_key of level_0) {
    const x = [];
    const y = [];

    const level_1 = Object.keys(data[level_0_key]);
    for (const level_1_key of level_1) {
      x.push(level_1_key);
      y.push(data[level_0_key][level_1_key]);
    }

    res.push({x, y, name: level_0_key, type});
  }

  return res;
}
