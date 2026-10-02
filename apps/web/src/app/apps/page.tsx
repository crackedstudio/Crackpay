import { AppsScreen } from "./AppsScreen";

// The listing needs the signed-in account for its guard and tab bar, so the
// screen itself is a Client Component, as the mini app route is.
export default function Discover() {
  return <AppsScreen />;
}
