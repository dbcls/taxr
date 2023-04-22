function init() {
  $.get('./taxonomy/candidate_names', (res) => {
    candidates = res.trim().split('\n')
  });

  $('#tags').focus();
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

$(function () {
  $('#tags').autocomplete({
    source: (request, response) => {
      response(
        $.grep(candidates, (value) => {
          let regexp = new RegExp('\\b' + escapeRegExp(request.term), 'i');
          return value.match(regexp);
        })
      );
    },
    autoFocus: true,
    delay: 100,
    minLength: 2,
    select: (e, ui) => {
      if (ui.item) {
        let name = ui.item.label;
        name = name.replace(/ \(.+\)$/, '');
        sparqlToRoot(name, (path) => {
          // blitzboard.setGraph('', true);
          addPath(path);
        });
      }
    }
  });
});

function sparqlToRoot(name, callback) {
  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX taxon: <http://ddbj.nig.ac.jp/ontologies/taxonomy/>
    SELECT ?tax ?name ?rank ?common_name
    WHERE {
      ?s a taxon:Taxon ;
         rdfs:label "${name}" ;
         rdfs:subClassOf ?tax option(transitive, t_direction 1, t_min 0, t_step("step_no") as ?level) .
      ?tax rdfs:label ?name .
      ?tax taxon:rank/rdfs:label ?rank .
      OPTIONAL {
        ?tax taxon:genbankCommonName ?common_name .
      }
    }
    ORDER BY DESC(?level)
    `;
  fetch(`https://spang.dbcls.jp/sparql?query=${encodeURIComponent(sparql)}&format=json`).then(res => {
    return res.json();
  }).then(json => {
    const results = json.results.bindings;
    let path = [];
    results.forEach((elem) => {
      const taxid = elem.tax.value.replace(/.*\//g, '');
      if (taxid != "1") {
        let node = {
          id: taxid,
          labels: ['Taxon'],
          properties: {
            'name': [elem.name.value],
            'taxon name': [elem.name.value],
            'taxon rank': [elem.rank.value],
          }
        };
        if (elem.common_name) {
          node.properties['taxon name'][0] += ` (${elem.common_name.value})`;
        }
        path.push(node);
      }
    });
    callback(path);
  });
}

function getThumb(name, callback) {
  const sparqlGetThum = `
        PREFIX wdt: <http://www.wikidata.org/prop/direct/>
        SELECT ?thumb ?name_ja ?rank_ja ?url ?descr_ja
        WHERE {
          ?url wdt:P225 "${name}" .
          ?url rdfs:label ?name_ja .
          ?url wdt:P105/rdfs:label ?rank_ja .
          OPTIONAL {
            ?url wdt:P18 ?thumb .
          }
          FILTER(lang(?name_ja) = 'ja')
          FILTER(lang(?rank_ja) = 'ja')
          OPTIONAL {
            ?url <http://schema.org/description> ?descr_ja .
            FILTER(lang(?descr_ja) = 'ja')
          }
        }`;
  fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlGetThum)}&format=json`).then(res => {
    return res.json();
  }).then(json => {
    callback(json.results.bindings);
  });
}

function addPath(path) {
  if (!blitzboard.hasNode(path[0].id)) {
    blitzboard.addNode(path[0], true);
  }
  for (let i=0; i<path.length-1; i++) {
    console.log(i);
    if (!blitzboard.hasNode(path[i+1].id)) {
      const node = path[i+1];
      getThumb(node.properties['name'], (results) => {
        for (let elem of results) {
          if (elem.thumb?.value) {
            node.properties.thumbnail = [elem.thumb.value];
          }
          if (elem.url?.value) {
            node.properties.Wikidata = [elem.url.value];
          }
          if (elem.descr_ja?.value) {
            node.properties.description = [elem.descr_ja.value];
          }
          if (elem.rank_ja?.value) {
            node.properties.rank_ja = [elem.rank_ja.value];
          }
          if (elem.name_ja?.value) {
            node.properties.name = [elem.name_ja.value];
          }
        }
        blitzboard.addNode(node, true);
        blitzboard.network.fit();
      });
    }
    if (!blitzboard.hasEdge(path[i].id, path[i+1].id)) {
      blitzboard.addEdge({ from: path[i].id, to: path[i+1].id, labels: ['child taxon'] });
    }
  }
}
