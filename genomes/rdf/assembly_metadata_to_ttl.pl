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
print "\@prefix taxid: <http://identifiers.org/taxonomy/> .\n";
print "\@prefix ncbio: <https://dbcls.github.io/ncbigene-rdf/ontology.ttl#> .\n";
print "\n";

while (<>) {
    chomp;
    my @f = split(/\t/, $_, -1);
    my $id = $f[0];
    my $taxid = $f[1];
    if ($taxid !~ /^\d+$/) {
        die;
    }
    s/\\/\\\\/g; # escape backslash
    print "assemblyId:$id\n";
    print "    ncbio:taxid taxid:$taxid ;\n";
    print "    ncbio:metadata '''$_ ''' .\n";
    print "\n";
}
