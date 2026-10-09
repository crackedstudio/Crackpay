import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

/*
 * Tailwind is on so this package can import `@crackpay/brand/tokens.css` and use
 * the real `.display`, `.figure` and `.label` classes and the real colour
 * tokens. Nothing about the brand is restated here: the stylesheet stays the one
 * place those values live, exactly as it is for the app and the site.
 */
Config.overrideBundlerConfig((config) => enableTailwind(config));

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
// The design is flat colour over large areas with 1.5px ink rules. A high
// bitrate keeps the rules from mushing and costs little on a 30-second file.
Config.setCrf(16);
