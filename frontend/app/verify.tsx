// Verify screen retired in favor of phone+PIN login.
// Kept as a redirect for any leftover deep links.
import React from "react";
import { Redirect } from "expo-router";

export default function Verify() {
  return <Redirect href="/login" />;
}
