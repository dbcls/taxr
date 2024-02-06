{
  node: {
    caption: ['name'],
    defaultIcon: true,
    onDoubleClick: (n) => window.open(n.url, '_blank'),
    onClick: (n) => {
      blitzboard.showLoader();
      const promiseParent = addParentNode(n.id);
      const promiseChild = addChildNode(n.id);
      Promise.all([promiseParent, promiseChild]).then(() => {
        blitzboard.update();
        blitzboard.hideLoader();
      });

      function addParentNode(taxid) {
        const sparql = sparqlTaxonomyTree(`taxid:${taxid}`, '?url');
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
        const sparql = sparqlTaxonomyTree('?url', `taxid:${taxid}`);
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
          }
        };
        getComment(elem.name.value, (commentRes) => {
          for (let element of commentRes.results.bindings) {
            if (element.comment?.value) {
              node.properties.comment = [element.comment.value];
            }
          }
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

      function sparqlTaxonomyTree(child, parent) {
        return `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX taxid: <http://identifiers.org/taxonomy/>
        PREFIX taxon: <http://ddbj.nig.ac.jp/ontologies/taxonomy/>
        SELECT ?url ?rank ?name
        WHERE {
          ${child} rdfs:subClassOf ${parent} .
          ?url rdfs:label ?name .
          ?url taxon:rank/rdfs:label ?rank .
        }
        `;
      }
    }

  },
  edge: {
    caption: [],
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
