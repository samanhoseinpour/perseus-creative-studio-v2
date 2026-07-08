"use client";
import Clarity from "@microsoft/clarity";
import { useEffect } from "react";

export default function MicrosoftClarity() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      Clarity.init("uqnl9emzm6");
    }
  }, []);

  return null;
}