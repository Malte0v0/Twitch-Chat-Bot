import { createClient } from 'graphql-ws';
import WebSocket from 'ws';

export class TruthService {
    constructor(chatService) {
        this._chatService = chatService;
        this._websocketUrl = "wss://api.synoptic.com/graphql";
        this._apiKey = process.env.TRUTH_API;
        this.start(this._websocketUrl);
    }

    getCleanText(data) {
        const message = data.data.streamPostCreated.text

        urlRegex = new RegExp("https?:\\/\\/(www\\.)?(?:truthsocial){1,256}\\.[a-zA-Z0-9()]{1,6}\\b[-a-zA-Z0-9()@:%_\\+.~#?&//=]*");
        postTypeRegex = new RegExp("Type:\\s+(\\w+)");

        message = message.replace(urlRegex, "");
        message = message.replace(postTypeRegex, "")
        message = message.replace("Link:", "");
        message = message.replace("truthsocial:", "");
        message = message.trim();

        return message;
    }

    start(websocketUrl=this._websocketUrl) {
        const websocketClient = createClient({
            url: websocketUrl,
            webSocketImpl: WebSocket,
            connectionParams: {
                apiKey: this._apiKey
            },
            keepAlive: 10000,
            retryAttempts: 5,
            on: {
                connected: (socket) => {
                    console.log("WebSocket connection opened to " + websocketUrl);
                },
                closed: (event) => {
                    console.log("TruthService connection closed:", event);
                },
                error: (error) => {
                    console.error("TruthService WebSocket error:", error);
                }
            }
        }) 

        // Subscription query
        const query = `
            subscription OnStreamPostCreated {
                streamPostCreated {
                    text
                    createdAt
                    streamId
                }
            }
        `;
        
        websocketClient.subscribe(
            { query },
            {
                next: (data) => {
                    try {
                        const message = this.getCleanText(data);
                        this._chatService.sendChatMessage(`${message}`, "1240551389")
                        .catch((error) => {
                            console.error(error);
                            });
                    } catch (error) {
                        console.log(error);
                    }
                },
                error: (error) => {
                    console.error("TruthService Subscription error:", error);
                },
                complete: () => {
                    console.log("TruthService Subscription complete");
                },
            },
        );
        console.log("Subscribed to OnStreamPostCreated TruthService");
    }
}