{
  node: {
    caption: ['name', 'count'],
    defaultIcon: true,
    // title: (n) => blitzboard.createTitle(n) + (n.thumbnail ? `<img width=200 src='${n.thumbnail}'>` : ''),
    title: (n) => {
      return createTitle(n);
      function createTitle(elem) {
        let idText = `<tr><td><b><a target"_blank" href="http://identifiers.org/taxonomy/${elem.id}">${elem.id}</a></b></td><td><b>${elem.name}</b></td></tr>`;
        Object.entries(elem.properties).forEach(([key, value]) => {
          if (key === 'thumbnail' || key === 'tax ID' || key === 'name' || key === 'Wikidata') {
            // skip
          } else if (key === 'taxon rank') {
            idText += `<tr valign="top"><td>rank</td><td>${value}</td></tr>`;
          } else if (key === 'taxon name') {
            idText += `<tr valign="top"><td>name</td><td>${value}</td></tr>`;
          } else {
            idText += `<tr valign="top"><td>${key}</td><td>${value}</td></tr>`;
          }
        });
        if (n.Wikidata) {
          let wikidata = n.Wikidata;
          const m = wikidata.match(/.*wikidata.org\/entity\/(\S+)$/);
          if (m) {
            wikidata = m[1];
          }
          idText += `<tr><td>Wikidata</td><td><a target"_blank" href="${n.Wikidata}">${wikidata}</a></td></tr>`;
        }
        let img = '';
        if (n.thumbnail) {
          img = `<a target="_blank" href="${n.thumbnail}"><img src="${n.thumbnail}" height="200"></a>`;
        }
        return `<table style='fixed'>${idText}</table>${img}`;
      }
    },
    onDoubleClick: (n) => window.open(n.url, '_blank'),
    onClick: (n) => {
      blitzboard.showLoader();
      const promiseParent = addParentNode(n.id);
      const promiseChild = addChildNode(n.id);
      Promise.all([promiseParent, promiseChild]).then(() => {
        blitzboard.update();
        blitzboard.hideLoader();
      });
      const sparql = sparqlGenomeMetadata(`taxid:${n.id}`);
      fetch(`https://spang.dbcls.jp/sparql?query=${encodeURIComponent(sparql)}&format=json`).then(res => {
        return res.json();
      }).then(result => {
        renderTable(result);
      });

      function addParentNode(taxid) {
        const sparql = sparqlTaxonomyTreeUp(`taxid:${taxid}`);
        const promise = fetch(`https://spang.dbcls.jp/sparql?query=${encodeURIComponent(sparql)}&format=json`).then(res => {
          return res.json();
        }).then(result => {
          for (let elem of result.results.bindings) {
            addNode(elem, (id) => {
              addEdge(taxid, id);
            });
          }
        });
        return promise;
      }

      function addChildNode(taxid) {
        const sparql = sparqlTaxonomyTreeDown(`taxid:${taxid}`);
        const promise = fetch(`https://spang.dbcls.jp/sparql?query=${encodeURIComponent(sparql)}&format=json`).then(res => {
          return res.json();
        }).then(result => {
          for (let elem of result.results.bindings) {
            addNode(elem, (id) => {
              addEdge(id, taxid);
            });
          }
        });
        return promise;
      }

      function addNode (elem, callback) {
        let id = elem.url.value.replace(/.*\//g, '');
        if (blitzboard.hasNode(id)) {
          return;
        }
        let node = {
          id: id,
          labels: ['Taxon'],
          properties: {
            'taxon name': [elem.name.value],
            'taxon rank': [elem.rank.value],
            'tax ID': [elem.url.value],
            'count': [elem.count.value],
          }
        };
        getThumb(elem.name.value, (result) => {
          for (let elem of result.results.bindings) {
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
          if (!node.properties.name) {
            node.properties.name = [elem.name.value];
          }
          blitzboard.addNode(node, false);
          callback(id);
        });
      }

      function addEdge (child, parent) {
        if (child && parent && !blitzboard.hasEdge(child, parent)) {
          blitzboard.addEdge({
            from: parent,
            to: child,
            labels: ['child taxon'],
          });
        }
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
        }).then(result => {
          callback(result);
        });
      }

      function getComment(name, callback) {
        name = name.replace(/ /g, '_');
        const sparql = `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dbpedia: <http://dbpedia.org/resource/>
        SELECT ?comment
        WHERE {
          dbpedia:${name} rdfs:comment ?comment .
          FILTER (lang(?comment) = "ja")
        }`;
        fetch(`https://dbpedia.org/sparql?query=${encodeURIComponent(sparql)}&format=json`).then(res => {
          return res.json();
        }).then(result => {
          callback(result);
        });
      }

      function sparqlTaxonomyTreeUp(child) {
        return `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX taxid: <http://identifiers.org/taxonomy/>
        PREFIX taxon: <http://ddbj.nig.ac.jp/ontologies/taxonomy/>
        PREFIX ncbio: <https://dbcls.github.io/ncbigene-rdf/ontology.ttl#>
        SELECT ?url ?rank ?name ?count
        WHERE {
          ${child} rdfs:subClassOf ?url .
          ?url rdfs:label ?name .
          ?url taxon:rank/rdfs:label ?rank .
          ?url ncbio:countRefSeqGenome ?count .
        }
        `;
      }

      function sparqlTaxonomyTreeDown(parent) {
        return `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX taxid: <http://identifiers.org/taxonomy/>
        PREFIX taxon: <http://ddbj.nig.ac.jp/ontologies/taxonomy/>
        PREFIX ncbio: <https://dbcls.github.io/ncbigene-rdf/ontology.ttl#>
        SELECT ?url ?rank ?name ?count
        WHERE {
          ?url rdfs:subClassOf ${parent} .
          ?url rdfs:label ?name .
          ?url taxon:rank/rdfs:label ?rank .
          ?url ncbio:countRefSeqGenome ?count .
        }
        `;
      }

      function sparqlGenomeMetadata(taxon) {
        return `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX taxid: <http://identifiers.org/taxonomy/>
        PREFIX ncbio: <https://dbcls.github.io/ncbigene-rdf/ontology.ttl#>
        SELECT ?accession ?metadata
        WHERE {
          ?taxid rdfs:subClassOf* ${taxon} .
          ?accession ncbio:taxid ?taxid .
          ?accession ncbio:metadata ?metadata .
        }
        `;
      }

      function renderTable(data) {
        const table = document.getElementById('resultsTable');
        table.innerHTML = '';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        [
          'TaxID',
          'Organism Name',
          'Common Name',
          'RefSeq category',
          'Contig N50',
          'BUSCO lineage',
          'BUSCO complete',
          '# of genes',
          'Genome size',
          'Assembly level',
          '# of chr',
          'Assembly method',
          'Genome coverage',
          'Sequencing technology',
          'Release date',
          'Submitter',
          'Sample details',
          'Accession',
        ].forEach(variable => {
          const th = document.createElement('th');
          th.textContent = variable;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        data.results.bindings.forEach(binding => {
          const tr = document.createElement('tr');
          let arr = binding.metadata.value.split('\t');
          arr.shift();
          arr.push(binding.accession.value);
          for (let i = 0; i < arr.length; i++) {
            const td = document.createElement('td');
            if (arr[i].match(/^http/)) {
              let link = document.createElement('a');
              link.href = arr[i];
              link.textContent = arr[i].replace(/.*\//, '');
              td.appendChild(link);
            } else if (i === 4 || i === 7 || i === 8) {
              td.textContent = Number(arr[i]).toLocaleString();
              td.style.textAlign = 'right';
            } else if (arr[i] === 'representative genome') {
              td.textContent = 'representative';
            } else {
              td.textContent = arr[i];
            }
            if (i === 12) {
              td.style.textAlign = 'right';
            }
            if (arr[i].match(/^\d\d\d\d-\d\d\-\d\d$/)) {
              td.style.whiteSpace = 'nowrap';
            }
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
      }
    }
  },
  edge: {
    caption: [],
    title: '',
    width: 3,
    selectionWidth: 0,
    opacity: 0.6
  },
  layout: 'hierarchical',
  layoutSettings: {
    enabled:true,
    levelSeparation: 150,
    nodeSpacing: 100,
    treeSpacing: 200,
    blockShifting: true,
    edgeMinimization: true,
    parentCentralization: true,
    direction: 'LR',        // UD, DU, LR, RL
    sortMethod: 'directed',  // hubsize, directed
    shakeTowards: 'roots'  // roots, leaves
  },
  extraOptions: {
    interaction: {
      selectConnectedEdges: false,
      hover: true,
      hoverConnectedEdges: false,
      keyboard: true,
      navigationButtons: true
    }
  }
}
