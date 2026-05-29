import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getJournalBySlug,
  checkUserAccess,
  getUserProgress,
} from "../services/moneyMagicService";
import MoneyMagicLocked from "./MoneyMagicLocked";
import MoneyMagicHome from "./MoneyMagicHome";
import "./MoneyMagicRouter.css";

const getSessionFromStorage = () => {
  try {
    const storageKey = Object.keys(localStorage).find(
      (k) => k.includes("sb-") && k.includes("-auth-token")
    );
    if (!storageKey) return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { userId: parsed?.user?.id };
  } catch {
    return null;
  }
};

function MoneyMagicRouter() {
  const navigate = useNavigate();
  // "checking" | "locked" | "home" | "redirecting"
  const [status, setStatus] = useState("checking");
  const [journal, setJournal] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const session = getSessionFromStorage();
      if (!session?.userId) {
        navigate("/login", { replace: true });
        return;
      }

      const journalData = await getJournalBySlug("money-magic");
      if (!alive) return;

      if (!journalData) {
        if (alive) setStatus("locked");
        return;
      }
      if (alive) setJournal(journalData);

      const { hasAccess } = await checkUserAccess(session.userId, journalData.id);
      if (!alive) return;

      if (!hasAccess) {
        if (alive) setStatus("locked");
        return;
      }

      const userProgress = await getUserProgress(session.userId, journalData.id);
      if (!alive) return;

      if (!userProgress) {
        navigate("/journal/money-magic/intro", { replace: true });
      } else {
        setProgress(userProgress);
        setStatus("home");
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [navigate]);

  if (status === "checking") {
    return (
      <div className="mmr-gate">
        <p className="mmr-gate-text">Loading your journal…</p>
      </div>
    );
  }

  if (status === "locked") {
    return <MoneyMagicLocked journal={journal} />;
  }

  if (status === "home") {
    return <MoneyMagicHome journal={journal} progress={progress} />;
  }

  // "redirecting" — navigate() is in flight
  return null;
}

export default MoneyMagicRouter;
