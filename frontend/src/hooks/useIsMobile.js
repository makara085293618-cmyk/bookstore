import { useWindowSize } from "./useWindowSize";

export function useIsMobile() {
  const { width } = useWindowSize();
  return width < 768;
}

export function useIsTablet() {
  const { width } = useWindowSize();
  return width >= 768 && width < 1024;
}

export function useIsDesktop() {
  const { width } = useWindowSize();
  return width >= 1024;
}
