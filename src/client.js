const Net = require('net');
const Stream = require('stream');

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
            ws.write(buf);
        ws.writable = false;
    };
    return result;
};


module.exports = {

    run: function (proxy, data) {
        const clientProcess = createPseudoProcess();
        const socket = new Net.Socket();
        const components = proxy.split(":");
        socket.connect(parseInt(components[1], 10), components[0], function() {
            var stdin = "";
            clientProcess.stdin.on("data", function (d) {
                stdin += d;
            });
            clientProcess.stdin.on("end", function () {
                socket.write(JSON.stringify({
                    data: data,
                    stdin: stdin
                }));
                socket.on("data", function (data) {
                    const result = JSON.parse(data);
                    clientProcess.stderr.push(result.stderr);
                    clientProcess.stderr.push(null);
                    clientProcess.stdout.push(result.stdout);
                    clientProcess.stdout.push(null);
                    clientProcess.trigger("close", result.status);
                });
            });
        });
        return clientProcess;
    }

};