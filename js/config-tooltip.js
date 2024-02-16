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
      updateTable(n.id);
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
