#!/bin/bash
if type forever &>/dev/null; then
    echo Forever found, running with forever.
    forever server.js
elif type node &>/dev/null; then
    echo Node found, running with node.
    node server.js
elif type nodejs &>/dev/null; then
    echo Nodejs found, running with nodejs.
    nodejs server.js
else
    echo Nodejs not detected! Did you install it?
fi
