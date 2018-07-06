'use strict';

const parliament_left_to_right = [
  'GUE/NGL',
  'S&D',
  'Verts/ALE',
  'ALDE',
  'PPE',
  'ECR',
  'EFDD',
  'ENF',
  'NI'
];

const position_top_to_bottom = [
  'For',
  'Against',
  'Neutral'
];

function parl_graph(vote_data) {
  const parliament = d3.parliament().width(600).innerRadiusCoef(0.4);

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

  parliament.enter.fromCenter(true).smallToBig(true);
  parliament.exit.toCenter(true).bigToSmall(true);

  d3.select('.parl').datum(data_parl).call(d => {
    parliament(d);
    d3.selectAll('.seat').each(function(e) {
      this.classList.add(e.data['position']);
    }).append("svg:title").text(d =>  d.data['group'] + ' ' + d.data['mep'] +
                                ': ' + d.data['position']); // tooltips
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

  const all_meps = unique(get(vote_data, 'mep')).sort();
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

      vote_data = vote_data.filter(d => selected_meps.incldes(d['mep']));
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
  d3.selectAll('.seat').each(function(e) {
    if (meps.length > 0) {
      if (meps.includes(e.data['mep'])) {
        this.classList.remove('disabled');
      } else {
        this.classList.add('disabled');
      }
    } else {
      if (positions.includes(e.data['position']) && groups.includes(e.data['group'])){
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

  create_bar_chart(document.getElementById('by_group'), 'Positions',
                   format_to_plot(count_by_pos_by_group));
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
