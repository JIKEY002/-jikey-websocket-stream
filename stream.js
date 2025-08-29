"use strict";

const { Transform } = require("stream");
const WS = require("ws");

function buildProxy(options, socketWrite, socketEnd) {
    const proxy = new Transform({ objectMode: options.objectMode });
    proxy._write = socketWrite;
    proxy._flush = socketEnd;
    return proxy;
}

function WebSocketStream(target, protocols, options = {}) {
    let socket;
    let stream;

    const isBrowser = process.title === "browser";
    const isNative = !!global.WebSocket;
    const socketWrite = isBrowser ? socketWriteBrowser : socketWriteNode;

    // Xử lý protocols là object
    if (protocols && typeof protocols === "object" && !Array.isArray(protocols)) {
        options = protocols;
        protocols = options.protocol || null;
    }

    options.objectMode ??= !(options.binary === true || options.binary === undefined);

    const proxy = buildProxy(options, socketWrite, socketEnd);
    if (!options.objectMode) proxy._writev = writev;

    // Khởi tạo socket
    socket = typeof target === "object" ? target : isNative && isBrowser ? new WS(target, protocols) : new WS(target, protocols, options);

    socket.binaryType = "arraybuffer";

    const eventListenerSupport = typeof socket.addEventListener !== "undefined";

    stream = socket.readyState === WS.OPEN ? proxy : require("duplexify")(undefined, undefined, options);

    stream.socket = socket;

    if (eventListenerSupport) {
        socket.addEventListener("open", onopen);
        socket.addEventListener("close", onclose);
        socket.addEventListener("error", onerror);
        socket.addEventListener("message", onmessage);
    } else {
        socket.onopen = onopen;
        socket.onclose = onclose;
        socket.onerror = onerror;
        socket.onmessage = onmessage;
    }

    proxy.on("close", destroy);

    function socketWriteNode(chunk, enc, next) {
        if (socket.readyState !== WS.OPEN) return next();
        socket.send(typeof chunk === "string" ? Buffer.from(chunk) : chunk, next);
    }

    function socketWriteBrowser(chunk, enc, next) {
        if (socket.bufferedAmount > (options.browserBufferSize || 512 * 1024)) {
            return setTimeout(socketWriteBrowser, options.browserBufferTimeout || 1000, chunk, enc, next);
        }
        try {
            socket.send(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            next();
        } catch (err) {
            next(err);
        }
    }

    function socketEnd(done) {
        socket.close();
        done();
    }

    function onopen() {
        stream.setReadable(proxy);
        stream.setWritable(proxy);
        stream.emit("connect");
    }

    function onclose() {
        stream.end();
        stream.destroy();
    }

    function onerror(err) {
        stream.destroy(err);
    }

    function onmessage(event) {
        let data = event.data;
        if (data instanceof ArrayBuffer) data = Buffer.from(data);
        else data = Buffer.from(data, "utf8");
        proxy.push(data);
    }

    function destroy() {
        socket.close();
    }

    function writev(chunks, cb) {
        const buffers = chunks.map((c) => (typeof c.chunk === "string" ? Buffer.from(c.chunk) : c.chunk));
        this._write(Buffer.concat(buffers), "binary", cb);
    }

    return stream;
}

module.exports = WebSocketStream;
