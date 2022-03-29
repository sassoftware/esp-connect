#!/bin/zsh

declare -A parms

KEY=""

for S in "$@"
do
    if [ -z $KEY ]
    then
        KEY=`echo $S | cut -b3-`
    elif [ "`echo $S | cut -b1-2`" = "--" ]
    then
        parms[$KEY]="true"
        KEY=`echo $S | cut -b3-`
    else
        parms[$KEY]="$S"
        KEY=""
    fi
done

if [ ! -z $KEY ]
then
    parms[$KEY]="true"
fi

function removeParm()
{
    unset "parms[$1]"
}

function removeParms()
{
    for i in $1
    do
        removeParm $i
    done
}

function showParms()
{
    for key val in "${(@kv)parms}"
    do
        echo "$key -> $val"
    done
}

#showParms
