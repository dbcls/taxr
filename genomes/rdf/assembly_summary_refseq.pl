#!/usr/bin/perl -w
use strict;
use File::Basename;
use Getopt::Std;
my $PROGRAM = basename $0;
my $USAGE=
"Usage: $PROGRAM
";

my %OPT;
getopts('', \%OPT);

print "\@prefix assemblyId: <https://identifiers.org/assembly/> .\n";
print "\@prefix ncbio: <https://dbcls.github.io/ncbigene-rdf/ontology.ttl#> .\n";
print "\@prefix taxid: <http://identifiers.org/taxonomy/> .\n";
print "\n";

while (<>) {
    chomp;
    if (/^#/) {
        next;
    }
    my @f = split(/\t/, $_, -1);
    if (@f != 38) {
        die;
    }
    my $id = $f[0];
    my $category = $f[4];
    my $taxid = $f[5];
    # if ($category eq 'na') {
    #     next;
    # }
    print "assemblyId:$id a ncbio:RefSeqGenome ;\n";
    print "    ncbio:taxid taxid:$taxid .\n";
}
