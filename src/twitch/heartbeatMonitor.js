// cleanupAll() {
//         this.clearHeartbeatMonitor();
//         this.cleanupMainConnection();
//         this.cleanupOldConnection();
//     }

//     clearHeartbeatMonitor() {
//         if (this._keepaliveInterval) {
//             clearInterval(this._keepaliveInterval);
//             this._keepaliveInterval = null;
//         }
//     }

//     cleanupMainConnection() {
//         if (this._mainWebSocketClient) {
//             console.log("Cleaning up main Twitch WebSocket connection");
//             this._mainWebSocketClient.removeAllListeners();

//             if (
//                 this._mainWebSocketClient.readyState === WebSocket.OPEN ||
//                 this._mainWebSocketClient.readyState === WebSocket.CONNECTING
//             ) {
//                 this._mainWebSocketClient.close(1000, "Cleaning up");
//             }

//             this._mainWebSocketClient = null;
//         }
//     }

//     cleanupOldConnection() {
//         if (this._oldWebSocketClient) {
//             console.log("Cleaning up old Twitch WebSocket connection");
//             this._oldWebSocketClient.removeAllListeners();

//             if (
//                 this._oldWebSocketClient.readyState === WebSocket.OPEN ||
//                 this._oldWebSocketClient.readyState === WebSocket.CONNECTING
//             ) {
//                 this._oldWebSocketClient.close(
//                     1000,
//                     "Cleaning up old connection",
//                 );
//             }

//             this._oldWebSocketClient = null;
//         }
//     }

//     resetReconnectInterval() {
//         this._reconnectInterval = 1000;
//     }

//         async startHeartbeatMonitor() {
//         this.clearHeartbeatMonitor();

//         this._keepaliveInterval = setInterval(() => {
//             const timeSinceLastWsMessage = Date.now() - this._latestWsMessage;
//             const timeout = this._keepaliveTimeoutSeconds * 1000 + 5000;

//             if (timeSinceLastWsMessage > timeout) {
//                 // Assume connection is dead and reconnect
//                 console.warn(
//                     `Twitch WebSocket connection is presumed dead (${timeSinceLastWsMessage}ms since last message), reconnecting...`,
//                 );
//                 this.reconnect();
//             }
//         }, 5000); // Check every 5 seconds
//     }

// reconnect(url = this._defaultWebSocketURL) {
//     // Reconnect debounce
//     if (this._reconnecting) {
//         console.log("Reconnection already in progress");
//         return;
//     }
//     this._reconnecting = true;

//     // Stop heartbeat monitor
//     this.clearHeartbeatMonitor();

//     if (this._isReconnectEvent) {
//         // Make a reference to the old WebSocket client
//         this._oldWebSocketClient = this._mainWebSocketClient;
//     } else {
//         // Close existing connection
//         this.cleanupAll();
//     }

//     console.log(
//         `Twitch WebSocket ${this._websocketSessionID || "unknown"} reconnecting with url: ${url}`,
//     );
//     // Make a new WebSocket client
//     this.connect(url);
// }
