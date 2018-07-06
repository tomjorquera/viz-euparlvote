const groupby = (data, key) => {
  const res = {};

  for (const entry of data) {
    const k = entry[key];
    if (!res[k]) {
      res[k] = [];
    }
    res[k].push(entry);
  }

  return res;
};

const aggr = (grouped_data, f) => {
  const res = {};

  for (const key of Object.keys(grouped_data)) {
    res[key] = f(grouped_data[key]);
  }

  return res;
};

const get = (data, columns)=> {
  if (!Array.isArray(columns)) {
    return data.map(d => d[columns]);
  } else {
    const res = [];
    for (const d of data) {
      const element = {};
      for (const k of columns) {
        element[k] = d[k];
      }
      res.push(element);
    }
    return res;
  } 
};

const unique = list => {
  return Array.from(new Set(list));
}

const clone = obj => {
  return JSON.parse(JSON.stringify(obj));
}
