import type { Metadata } from "next";

export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};
