import { useEffect, useRef } from "react";
import Shepherd from "shepherd.js";
import { supabase } from "../supabaseClient";

export default function useOnboardingTour(userId, spellsReady) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!userId || !spellsReady || hasRunRef.current) return;

    let alive = true;

    const run = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("has_seen_onboarding")
        .eq("id", userId)
        .maybeSingle();

      if (!alive || error || data?.has_seen_onboarding) return;

      hasRunRef.current = true;

      // Give the DOM one frame to finish painting before attaching
      await new Promise((res) => setTimeout(res, 400));
      if (!alive) return;

      // Guard: if spell cards didn't render (empty library), skip
      if (!document.getElementById("tour-spell-card")) {
        hasRunRef.current = false;
        return;
      }

      const markSeen = () =>
        supabase
          .from("profiles")
          .update({ has_seen_onboarding: true })
          .eq("id", userId);

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: { enabled: false },
          scrollTo: { behavior: "smooth", block: "center" },
          modalOverlayOpeningRadius: 8,
          modalOverlayOpeningPadding: 6,
        },
      });

      const skip = () => ({
        text: "Skip tour",
        action: tour.cancel.bind(tour),
        classes: "shepherd-btn-skip",
      });

      const next = () => ({
        text: "Next",
        action: tour.next.bind(tour),
        classes: "shepherd-btn-primary",
      });

      const finish = () => ({
        text: "Finish",
        action: tour.complete.bind(tour),
        classes: "shepherd-btn-primary",
      });

      tour.addStep({
        id: "step-find-spell",
        attachTo: { element: "#tour-find-spell", on: "bottom" },
        text: "Not sure where to start? Answer a few quick questions and we’ll match you with the right spell. Takes two minutes.",
        buttons: [next(), skip()],
      });

      tour.addStep({
        id: "step-spell-card",
        attachTo: { element: "#tour-spell-card", on: "right" },
        text: "Browse 262 spells across every category. Click any card to open it. Over 113 are completely free.",
        buttons: [next(), skip()],
      });

      tour.addStep({
        id: "step-favorite-btn",
        attachTo: { element: "#tour-favorite-btn", on: "right" },
        text: "Save spells you love so you can find them again easily. They’ll live in My Library.",
        buttons: [next(), skip()],
      });

      tour.addStep({
        id: "step-my-library",
        attachTo: { element: "#tour-my-library", on: "bottom" },
        text: "Your saved spells, collections, and practice journal all live here. This is your personal space.",
        buttons: [next(), skip()],
      });

      tour.addStep({
        id: "step-moon-phase",
        attachTo: { element: "#tour-moon-phase", on: "right" },
        text: "Your spells connect to lunar cycles. This tells you exactly where you are right now.",
        buttons: [finish(), skip()],
      });

      tour.on("complete", markSeen);
      tour.on("cancel", markSeen);

      tour.start();
    };

    run();

    return () => {
      alive = false;
    };
  }, [userId, spellsReady]);
}
