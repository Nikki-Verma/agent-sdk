import { Room, RoomOptions } from "livekit-client";

export const roomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    simulcast: true,
  },
};

export const createRoom = () => {
  return new Room(roomOptions);
};
