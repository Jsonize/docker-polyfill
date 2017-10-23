#!/usr/local/bin/node

const Runner = require(__dirname + "/../src/runner.js");

Runner.runServer(process.argv[2]);
