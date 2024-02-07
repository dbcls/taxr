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
print "\n";

while (<>) {
    chomp;
    my @f = split(/\t/, $_, -1);
    my $id = $f[0];
    s/\\/\\\\/g;
    print "assemblyId:$id ncbio:metadata '''$_ ''' .\n";
}
