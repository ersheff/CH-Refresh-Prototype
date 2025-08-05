## Protocol

For consistency across platforms, all messages must include valid OSC addresses. The address format determines how a message is interpreted and routed by the server.

### Outgoing

There are four types of outgoing messages, determined by the first segment of the OSC address:

- `/broadcast` - Broadcasts to all connected clients.
- `/feed` - Sent only to clients subscribed to the sending user's feed.
- `/room/roomname` - Broadcasts to all clients in the specified room.
- `/user/username` - Sent directly to the specified user.

Any number of additional path segments may optionally follow for more detailed routing on the receiving end.

Examples:

- `/broadcast/volume 0.9`
- `/feed/sample piano.wav`
- `/room/melody/synth/cutoff 500`
- `/user/eric 1 2 3`

### Incoming

Incoming messages include an OSC address that identifies the origin:

- `/broadcast/username`
- `/feed/username`
- `/room/roomname/username`
- `/user/username`

On the receiving end, `username` corresponds with the sender's username (it is added or replaced by the server as needed). These addresses may also be followed by additional path segments.

## Users

To subscribe or unsubscribe from a user's feed, click the toggle next to their username.

## Rooms

To join or leave a room, click the toggle next to the room name. You do not need to be in a room to send data to it. Empty rooms are deleted automatically when the last user leaves. You can "force delete" a room by clicking the button next to its name.
