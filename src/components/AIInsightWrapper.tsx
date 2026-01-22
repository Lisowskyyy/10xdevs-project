import { useState, useEffect } from "react";
import AIInsightButton from "./AIInsightButton";

interface Props {
  formId: string;
}

export default function AIInsightWrapper({ formId }: Props) {
  const [journalEntry, setJournalEntry] = useState("");
  const [userStage, setUserStage] = useState("Albedo");

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;

    const textarea = form.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    const moodInputs = form.querySelectorAll('input[name="mood"]');

    const updateJournalEntry = () => {
      if (textarea) {
        setJournalEntry(textarea.value);
      }
    };

    const updateStage = () => {
      const selectedMood = Array.from(moodInputs).find((input) => (input as HTMLInputElement).checked) as
        | HTMLInputElement
        | undefined;

      if (selectedMood) {
        const moodToStage: Record<string, string> = {
          joy: "Citrinitas",
          calm: "Albedo",
          sadness: "Nigredo",
          anger: "Rubedo",
          fear: "Nigredo",
          neutral: "Albedo",
        };
        setUserStage(moodToStage[selectedMood.value] || "Nigredo");
      }
    };

    // Initial update
    updateJournalEntry();
    updateStage();

    // Add event listeners
    if (textarea) {
      textarea.addEventListener("input", updateJournalEntry);
    }

    moodInputs.forEach((input) => {
      input.addEventListener("change", updateStage);
    });

    // Cleanup
    return () => {
      if (textarea) {
        textarea.removeEventListener("input", updateJournalEntry);
      }
      moodInputs.forEach((input) => {
        input.removeEventListener("change", updateStage);
      });
    };
  }, [formId]);

  return <AIInsightButton journalEntry={journalEntry} userStage={userStage} />;
}
