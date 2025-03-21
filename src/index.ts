import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();

const httpServer = http.createServer({});
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

interface Room {
  title: string;
  description: string;
  liveId: string;
}

const rooms = [] as Room[];

interface LiveStartProps {
  title: string;
  description: string;
  liveId: string;
}

io.on("connection", (socket) => {
  socket.on(
    "start_broadcast",
    ({ description, liveId, title }: LiveStartProps) => {
      rooms.push({
        description,
        liveId,
        title,
      });
    }
  );
  socket.on("join_room", ({ liveId }) => {
    socket.join(liveId);
    socket.to(liveId).emit("join_user");
  });
  socket.on("offer", (offer, liveId) => {
    socket.to(liveId).emit("offer", offer);
  });
  socket.on("answer", (answer, liveId) => {
    socket.to(liveId).emit("answer", answer);
  });
  socket.on("ice", (ice, liveId) => {
    socket.to(liveId).emit("ice", ice);
  });
});

httpServer.listen(5555, () => {
  console.log("server running at http://localhost:5555");
});
