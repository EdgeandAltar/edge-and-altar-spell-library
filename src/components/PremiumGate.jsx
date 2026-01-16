import { useEffect, useState } from "react";
import { getAccessLevel } from "../access";

export default function PremiumGate({ children, fallback }) {
  const [level, setLevel] = useState(null);

  useEffect(() => {
    getAccessLevel()
      .then(setLevel)
      .catch((err) => {
        console.error("Access check failed:", err);
        setLevel("free");
      });
  }, []);

  if (level === null) return <div>Loading...</div>;

  if (level === "premium") return children;

  return fallback ?? <div>This content is locked. Upgrade to Premium.</div>;
}
