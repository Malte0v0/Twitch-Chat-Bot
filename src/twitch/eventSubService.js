// async registerEventSubListeners() {
//     try {
//         let response = await fetch(
//             "https://api.twitch.tv/helix/eventsub/subscriptions",
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: "Bearer " + this._authService.oauthToken,
//                     "Client-Id": this._authService.clientId,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     type: "channel.chat.message",
//                     version: "1",
//                     condition: {
//                         broadcaster_user_id:
//                             this._chatService.chatChannelUserId,
//                         user_id: this._chatService.botUserId,
//                     },
//                     transport: {
//                         method: "websocket",
//                         session_id: this._websocketSessionID,
//                     },
//                 }),
//             },
//         );

//         const data = await response.json();

//         if (response.status !== 202) {
//             console.error(
//                 "Failed to subscribe to channel.chat.message. API call returned status code " +
//                     response.status,
//             );
//             console.error(data);
//         } else {
//             console.log(
//                 `Subscribed to channel.chat.message [${data.data[0].id}]`,
//             );
//         }
//     } catch (error) {
//         console.warn("Error registering EventSub listener:", error);

//         setTimeout(() => {
//             this.reconnect();
//         }, 5000);
//     }
// }
