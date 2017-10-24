const Net = require('net');
const Stream = require('stream');
const EventEmitter = require('events');

const createPseudoProcess = function () {
    var result = new EventEmitter();
    result.stderr = new Stream.Readable();
    result.stderr._read = function () {};
    result.stdout = new Stream.Readable();
    result.stdout._read = function () {};
    result.stdin = new Stream();
    result.stdin.writable = true;
    result.stdin.bytes = 0;
    result.stdin.write = function(buf) {
        result.stdin.bytes += buf.length;
    };
    result.stdin.end = function(buf) {
        if (buf)
            result.stdin.write(buf);
        result.stdin.writable = false;
    };
    return result;
};


module.exports = {

    run: function (proxy, data) {
        const clientProcess = createPseudoProcess();
        const socket = new Net.Socket();
        const components = proxy.split(":");
        var stdin = "";
        var called = false;
        clientProcess.stdin.on("data", function (d) {
            called = true;
            stdin += d;
        });
        var timeout = setTimeout(function () {
            if (called)
                return;
            clientProcess.stdin.emit("end");
        }, 1000);
        clientProcess.stdin.on("end", function () {
            clearTimeout(timeout);
            socket.connect(parseInt(components[1], 10), components[0], function() {
                socket.write(JSON.stringify({
                    data: data,
                    stdin: stdin
                }));
                var resultData = "";
                socket.on("data", function (data) {
                    resultData += data;
                });
                socket.on("end", function () {
                    const result = JSON.parse(resultData);
                    clientProcess.stderr.push(result.stderr);
                    clientProcess.stderr.push(null);
                    clientProcess.stdout.push(result.stdout);
                    clientProcess.stdout.push(null);
                    clientProcess.emit("close", result.status);
                });
            });
        });
        return clientProcess;
    }

};