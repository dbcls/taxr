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

!@ARGV && -t and die $USAGE;
open(PIPE, "|sort") || die "$!";
while (<>) {
    chomp;
    my @f = split(/\t/, $_);
    my $common_name = $f[1];
    my $name = $f[2];
    $common_name =~ s/^"(.+)"$/$1/;
    $name =~ s/^"(.+)"$/$1/;
    if (@f != 4) {
        die $_;
    }
    print PIPE "$name ($common_name)\n";    
}
close(PIPE);
