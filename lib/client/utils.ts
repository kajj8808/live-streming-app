export function forcePreferredCodec(sdp: string, codec: string) {
  const lines = sdp.split("\n");
  const mLineIndex = lines.findIndex((line) => line.startsWith("m=video"));
  const codecLine = lines.find((line) => line.includes(codec));

  if (mLineIndex === -1 || !codecLine) return sdp; // 해당 코덱 없으면 패스

  const matchResult = codecLine.match(/:(\d+) /);
  if (!matchResult) return sdp;

  const codecPayload = matchResult[1];
  lines[mLineIndex] = lines[mLineIndex].replace(/:(\d+)/g, `:${codecPayload}`);

  return lines.join("\n");
}
