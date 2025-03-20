"use client";

import { io } from "socket.io-client";

const socket = io("ws://localhost:5555");

export default socket;
