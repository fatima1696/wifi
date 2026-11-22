import React from "react";
import { Composition } from "remotion";
import { WifiVideo } from "./WifiVideo";
import { FPS, TOTAL_SECONDS } from "./script";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WifiThroughWalls"
      component={WifiVideo}
      durationInFrames={Math.round(TOTAL_SECONDS * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ voiceover: false }}
    />
  );
};
