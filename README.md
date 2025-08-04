## Protocol

For consistency across platforms, all messages must use valid OSC addresses. The address path determines how a message is routed and interpreted.

### Outgoing

There are four types of outgoing messages, determined by the first segment of the OSC address:

- `/feed` - Sent only to clients subscribed to the sending user's feed.
- `/broadcast` - Broadcast to all connected clients.
- `/room/name` - Broadcast to all clients in the specified room.
- `/user/name` - Sent directly to the specified user.

Any number of additional path segments may follow for more detailed routing on the receiving end.

Example: `/room/melody/synth/cutoff`

### Incoming

Incoming messages include an OSC address that identifies the origin:

- `/user/name`
- `/room/name`

These may be also followed by additional path segments.

## Users

To subscribe or unsubscribe to a user's feed, click the checkbox next to their username.

## Rooms

To join or leave a room, click the checkbox next to the room name. You do not need to be in a room to send data to it. Empty rooms are deleted automatically when the last user leaves. You can "force delete" a room by clicking the **X** next to the room name.
