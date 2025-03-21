"use client";

import { useEffect, useRef, useState } from "react";
import socket from "./socket";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const myPeerConnectionRef = useRef<RTCPeerConnection | undefined>(undefined);

  // FIXME: 이 부분은 나중에 로그인 구현 후 user id 등을 사용해서.
  const [liveId, setLiveId] = useState("");

  useEffect(() => {
    setLiveId("0d027498b18371674fac3ed17247e6b8");
  }, []);

  useEffect(() => {
    if (liveId) {
      socket.emit("join_room", { liveId });

      socket.on("offer", async (offer) => {
        myPeerConnectionRef.current = new RTCPeerConnection({
          iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
              ],
            },
          ],
          iceTransportPolicy: "relay",
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
        });
        myPeerConnectionRef.current.addEventListener("icecandidate", (data) => {
          socket.emit("ice", data.candidate, liveId);
        });
        myPeerConnectionRef.current.addEventListener("track", (data) => {
          if (videoRef.current) {
            const [remoteStream] = data.streams;
            videoRef.current.srcObject = remoteStream;
          }
        });
        await myPeerConnectionRef.current?.setRemoteDescription(offer);
        const answer = await myPeerConnectionRef.current?.createAnswer({});

        myPeerConnectionRef.current.setLocalDescription(answer);
        socket.emit("answer", answer, liveId);
      });

      socket.on("ice", (ice) => {
        myPeerConnectionRef.current?.addIceCandidate(ice);
      });
    }
    return () => {
      socket.off("offer");
    };
  }, [liveId]);

  return (
    <div className="w-full min-h-dvh h-screen flex justify-center items-center ">
      <div>
        <video controls ref={videoRef}></video>
      </div>
    </div>
  );
}
