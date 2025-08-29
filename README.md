# @jikey/websocket-stream

A Node.js library for creating stream interfaces over WebSocket connections. Built on top of `ws`, `duplexify`, and Node.js streams.

## Features
- Stream API for WebSocket connections
- Easy integration with existing Node.js stream pipelines
- Server and client support

## Installation
```sh
npm install @jikey/websocket-stream
```

## Usage

### Client Example
```js
const websocketStream = require('@jikey/websocket-stream');
const ws = websocketStream('ws://localhost:8080');

ws.write('hello');
ws.on('data', (data) => {
  console.log('Received:', data);
});
```

### Server Example
```js
const { createServer } = require('@jikey/websocket-stream');
const server = createServer({ port: 8080 }, (stream, req) => {
  stream.on('data', (data) => {
    stream.write('Echo: ' + data);
  });
});
```

## API
- `websocketStream(target, protocols?, options?)`: Create a duplex stream over a WebSocket connection.
- `createServer(options, callback)`: Create a WebSocket server that emits `stream` events.

## License
ISC
