"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import socket from "../socket";

const formSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
});

export default function Page() {
  const { register, handleSubmit } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // FIXME: 이 부분은 나중에 로그인 구현 후 user id 등을 사용해서.
  const [liveId, setLiveId] = useState("");

  const myPeerConnectionRef = useRef<RTCPeerConnection | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [myStream, setMyStream] = useState<MediaStream | undefined>(undefined);

  async function getMedia() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      // 가상 오디오 장치 선택
      const audioDevice = devices.find((device) =>
        device.label.includes("CABLE Output")
      );

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          deviceId: audioDevice ? audioDevice.deviceId : undefined,
          echoCancellation: false, // 에코 제거
        },
      });

      setMyStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.log(error);
    }
  }

  function changeVideoCodec() {
    if (myPeerConnectionRef.current) {
      const transceivers = myPeerConnectionRef.current.getTransceivers();

      transceivers.forEach((transceiver) => {
        const kind = transceiver.sender.track?.kind;
        if (!kind) return;
        const sendCodecs = RTCRtpSender.getCapabilities(kind);
        const recvCodecs = RTCRtpReceiver.getCapabilities(kind);

        /*  if (kind === "video") {
          sendCodecs = 
          recvCodecs = 
          console.log("")
        } */

        if (kind === "video") {
          const sendCodec = sendCodecs?.codecs.find((codec) =>
            codec.mimeType.includes("AV1")
          );
          const recvCodec = recvCodecs?.codecs.find((codec) =>
            codec.mimeType.includes("AV1")
          );
          // FIXME: vp9 codec이 있다고 가정.
          transceiver.setCodecPreferences([sendCodec!, recvCodec!]);
        }
        if (kind === "audio") {
          const sendCodec = sendCodecs?.codecs.find((codec) =>
            codec.mimeType.includes("opus")
          );
          const recvCodec = recvCodecs?.codecs.find((codec) =>
            codec.mimeType.includes("opus")
          );
          // FIXME: vp9 codec이 있다고 가정.
          transceiver.setCodecPreferences([sendCodec!, recvCodec!]);
        }
        // console.log(kind, sendCodecs?.codecs);
        // console.log(kind, recvCodecs?.codecs);
        myPeerConnectionRef.current.onnegotiationneeded();
      });
    }
  }

  const onSubmit = ({ title, description }: z.infer<typeof formSchema>) => {
    if (myStream) {
      socket.emit("start_broadcast", { title, description, liveId });
      socket.emit("join_room", { liveId });

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
      });
      /*       myPeerConnectionRef.current.addEventListener("icecandidate", (data) => {
        console.log(data);
      });
       */
      myStream.getTracks().forEach((track) => {
        myPeerConnectionRef.current?.addTrack(track, myStream);
      });

      myPeerConnectionRef.current.addEventListener(
        "icegatheringstatechange",
        () => {
          /*  if (myPeerConnectionRef.current?.iceGatheringState === "complete") {
            const senders = myPeerConnectionRef.current.getSenders();
            senders.forEach((sender) => {
              if (sender.track?.kind === "video") {
                console.log(sender.getParameters().codecs);
              }
            });
          } */
          changeVideoCodec();
        }
      );
    }
  };

  useEffect(() => {
    setLiveId("0d027498b18371674fac3ed17247e6b8");
  }, []);

  useEffect(() => {
    if (videoRef.current && liveId) {
      getMedia();

      socket.on("join_user", async () => {
        const offer = await myPeerConnectionRef.current?.createOffer();

        await myPeerConnectionRef.current?.setLocalDescription(offer);
        socket.emit("offer", offer, liveId);
      });

      socket.on("answer", async (answer) => {
        await myPeerConnectionRef.current?.setRemoteDescription(answer);
      });

      socket.on("ice", (ice) => {
        myPeerConnectionRef.current?.addIceCandidate(ice);
      });
    }
    return () => {
      socket.off("join_user");
      socket.off("answer");
    };
  }, [liveId]);

  return (
    <div className="w-full min-h-dvh h-full flex justify-center items-center">
      <form
        className="w-sm flex flex-col gap-2"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h3 className="font-semibold text-2xl">Studio</h3>
        <Input placeholder="title" {...register("title")} />
        <Input placeholder="description" {...register("description")} />
        <video
          ref={videoRef}
          controls
          autoPlay
          className="aspect-video rounded-md"
        ></video>
        <Button>Go Live</Button>
      </form>
    </div>
  );
}
