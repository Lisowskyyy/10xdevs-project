import { supabase } from "./supabase";

// Emotion buttons
const emotionButtons = document.querySelectorAll(".emotion-btn");
const selectedEmotionInput = document.getElementById("selected-emotion") as HTMLInputElement | null;

emotionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    emotionButtons.forEach((btn) => btn.classList.remove("selected"));
    button.classList.add("selected");
    const emotion = button.getAttribute("data-emotion");
    if (selectedEmotionInput) {
      selectedEmotionInput.value = emotion || "";
    }
  });
});

// Character counter
const textarea = document.getElementById("gratitude-text") as HTMLTextAreaElement | null;
const charCount = document.getElementById("char-count");

if (textarea && charCount) {
  textarea.addEventListener("input", () => {
    const length = textarea.value.length;
    charCount.textContent = length.toString();
    if (length > 1000) {
      textarea.value = textarea.value.substring(0, 1000);
      charCount.textContent = "1000";
    }
  });
}

// Form submission
const form = document.getElementById("gratitude-form");
const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement | null;
const successMessage = document.getElementById("success-message");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");

if (form && submitBtn) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const gratitudeTextEl = document.getElementById("gratitude-text") as HTMLTextAreaElement | null;
    const categoryEl = document.getElementById("category") as HTMLSelectElement | null;
    const gratitudeText = gratitudeTextEl ? gratitudeTextEl.value : "";
    const category = categoryEl ? categoryEl.value : "other";
    const emotion = selectedEmotionInput ? selectedEmotionInput.value : "";

    if (!gratitudeText.trim()) {
      showError("Proszę wpisać swoją wdzięczność.");
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    const btnTextEl = submitBtn.querySelector(".btn-text") as HTMLElement | null;
    const btnLoadingEl = submitBtn.querySelector(".btn-loading") as HTMLElement | null;
    if (btnTextEl) btnTextEl.style.display = "none";
    if (btnLoadingEl) btnLoadingEl.style.display = "flex";

    try {
      const alchemicalPhase = mapEmotionToPhase(emotion);

      const { error } = await supabase.from("gratitude_entries").insert([
        {
          gratitude_text: gratitudeText,
          gratitude_category: category,
          emotion: emotion || null,
          alchemical_phase: alchemicalPhase,
        },
      ]);

      if (error) throw error;

      showSuccess();
      (form as HTMLFormElement).reset();
      emotionButtons.forEach((btn) => btn.classList.remove("selected"));
      if (selectedEmotionInput) selectedEmotionInput.value = "";
      if (charCount) charCount.textContent = "0";
      loadGratitudes();
    } catch {
      showError("Wystąpił błąd podczas zapisywania. Spróbuj ponownie.");
    } finally {
      submitBtn.disabled = false;
      const btnTextEl2 = submitBtn.querySelector(".btn-text") as HTMLElement | null;
      const btnLoadingEl2 = submitBtn.querySelector(".btn-loading") as HTMLElement | null;
      if (btnTextEl2) btnTextEl2.style.display = "inline";
      if (btnLoadingEl2) btnLoadingEl2.style.display = "none";
    }
  });
}

// Helper functions
function mapEmotionToPhase(emotion: string) {
  const mapping: Record<string, string> = {
    joy: "citrinitas",
    gratitude: "rubedo",
    love: "rubedo",
    peace: "albedo",
    calm: "albedo",
    hope: "citrinitas",
  };
  return mapping[emotion || ""] || "albedo";
}

function showSuccess() {
  if (successMessage) {
    (successMessage as HTMLElement).style.display = "flex";
    setTimeout(() => {
      (successMessage as HTMLElement).style.display = "none";
    }, 5000);
  }
}

function showError(message: string) {
  if (errorMessage && errorText) {
    errorText.textContent = message;
    (errorMessage as HTMLElement).style.display = "flex";
    setTimeout(() => {
      (errorMessage as HTMLElement).style.display = "none";
    }, 5000);
  }
}

// Load gratitudes
async function loadGratitudes() {
  const gratitudeList = document.getElementById("gratitude-list");
  if (!gratitudeList) return;

  try {
    const { data, error } = await supabase
      .from("gratitude_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      gratitudeList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💚</div>
          <p>Jeszcze nie masz żadnych wdzięczności.</p>
          <p>Zacznij dzisiaj!</p>
        </div>
      `;
      return;
    }

    gratitudeList.innerHTML = data
      .map(
        (item) => `
      <div class="gratitude-item">
        <div class="gratitude-item-header">
          <span class="gratitude-category">${getCategoryLabel(item.gratitude_category)}</span>
          <span class="gratitude-date">${formatDate(item.created_at)}</span>
        </div>
        <p class="gratitude-text">${item.gratitude_text}</p>
        ${
          item.emotion
            ? `<span class="gratitude-emotion">${getEmotionEmoji(item.emotion)} ${getEmotionLabel(item.emotion)}</span>`
            : ""
        }
      </div>
    `
      )
      .join("");
  } catch {
    gratitudeList.innerHTML = '<div class="loading">Wystąpił błąd podczas ładowania.</div>';
  }
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    health: "🌿 Zdrowie",
    relationships: "💞 Relacje",
    abundance: "✨ Obfitość",
    personal_growth: "🌱 Rozwój",
    nature: "🌍 Natura",
    other: "Inne",
  };
  return labels[category] || "Inne";
}

function getEmotionEmoji(emotion: string) {
  const emojis: Record<string, string> = {
    gratitude: "🙏",
    joy: "😊",
    peace: "☮️",
    love: "💖",
    hope: "🌟",
    calm: "🧘",
  };
  return emojis[emotion] || "💚";
}

function getEmotionLabel(emotion: string) {
  const labels: Record<string, string> = {
    gratitude: "Wdzięczność",
    joy: "Radość",
    peace: "Spokój",
    love: "Miłość",
    hope: "Nadzieja",
    calm: "Ukojenie",
  };
  return labels[emotion] || emotion;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Dzisiaj";
  if (diffDays === 1) return "Wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;

  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

// Load gratitudes on page load
loadGratitudes();
