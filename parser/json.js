#!/usr/bin/env node
const fs = require('fs');
const program = require('commander');
const readline = require('readline');

program
  .arguments('<jsonl_file>')
  .option('--n50', 'N50 >= 1M')
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
const opts = program.opts();

const rs = fs.createReadStream(program.args[0], 'utf8');
const rl = readline.createInterface({ input: rs });

rl.on('line', (line) => {
  const obj = JSON.parse(line);

  let sex = '';
  let breed = '';
  let tissue = '';
  obj.assembly_info.biosample?.attributes?.forEach((elem) => {
    if (elem.value === 'missing' || elem.value === 'NOT COLLECTED') {
      return;
    }
    if (elem.name === 'sex') {
      sex = elem.value;
    }
    if (elem.name === 'breed') {
      breed = elem.value;
    }
    if (elem.name === 'tissue') {
      tissue = elem.value;
    }
  });
  const sample = [];
  if (sex) {
    sample.push(sex);
  }
  if (breed) {
    sample.push(breed);
  }
  if (tissue) {
    sample.push(tissue);
  }

  const arr = [
    obj.accession,
    obj.organism.tax_id,
    obj.organism.organism_name,
    obj.organism.common_name,
    obj.assembly_info.refseq_category,
    obj.assembly_stats.contig_n50,
    obj.annotation_info?.busco?.busco_lineage,
    obj.annotation_info?.busco?.complete,
    obj.annotation_info?.stats.gene_counts.total,
    obj.assembly_stats.total_sequence_length,
    obj.assembly_info.assembly_level,
    obj.assembly_stats.total_number_of_chromosomes,
    obj.assembly_info.assembly_method,
    obj.assembly_stats.genome_coverage,
    obj.assembly_info.sequencing_tech,
    obj.assembly_info.release_date,
    obj.assembly_info.submitter,
    sample.join(', '),
  ];

  if (opts.n50 && obj.assembly_stats.contig_n50 < 1000000) {
    return;
  }
  console.log(arr.join('\t'));
});
