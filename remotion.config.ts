import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
// Three.js frames can be slow on a software GPU (GitHub runners), so be patient.
Config.setDelayRenderTimeoutInMilliseconds(180000);
