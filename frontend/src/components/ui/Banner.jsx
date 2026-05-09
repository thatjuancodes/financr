import React from "react";

const TONE_CLASS = {
  success: "app-banner app-banner-success",
  error: "app-banner app-banner-error",
  info: "app-banner app-banner-info",
};

export default function Banner({ tone = "info", children }) {
  return <p className={TONE_CLASS[tone] || TONE_CLASS.info}>{children}</p>;
}
