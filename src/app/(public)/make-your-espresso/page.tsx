import type { Metadata } from "next";
import { EspressoBlendStudio } from "@/features/website/make-your-espresso/EspressoBlendStudio";

export const metadata: Metadata = {
  title: "Make Your Espresso | Line Coffee",
  description: "Build a custom whole-bean espresso blend with smart ratios, live metrics, and premium coffee origins.",
};

export default function MakeYourEspressoPage() {
  return <EspressoBlendStudio />;
}
