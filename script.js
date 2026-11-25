
const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("promptInput");
const responseBox = document.getElementById("response");
const learningStyle = document.getElementById("learningStyle");

const sendButton = promptForm?.querySelector(
  'button[type="submit"]'
);

let conversationHistory = [];
let preferredStyle = learningStyle?.value || "simple";

const styleInstructions = {
  simple: "Explain things simply and step by step.",
  detailed: "Give detailed explanations and examples.",
  creative: "Be creative, engaging, and playful.",
  direct: "Be concise, clear, and direct."
};

function showResponse(message, isError = false) {
  if (!responseBox) return;

  responseBox.hidden = false;
  responseBox.textContent = message;
  responseBox.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  if (!sendButton) return;

  sendButton.disabled = isLoading;
  sendButton.textContent = isLoading
    ? "Thinking..."
    : "Ask NOVA ↑";
}

async function askNOVA(message) {
  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      style: preferredStyle,
      history: conversationHistory
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "NOVA received an unexpected response. Check that the backend is running."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || `The server returned error ${response.status}.`
    );
  }

  if (!data.reply) {
    throw new Error("NOVA did not return a reply. Please try again.");
  }

  return data.reply;
}

if (learningStyle) {
  learningStyle.addEventListener("change", () => {
    preferredStyle = learningStyle.value;
  });
}

if (promptForm && promptInput && responseBox) {
  promptForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = promptInput.value.trim();

    if (!message) {
      showResponse("Type a message first, and NOVA will help you!");
      return;
    }

    if (message.length > 4000) {
      showResponse(
        "Please keep your message under 4,000 characters.",
        true
      );
      return;
    }

    setLoading(true);
    showResponse("NOVA is thinking...");

    try {
      const reply = await askNOVA(message);

      conversationHistory.push(
        { role: "user", content: message },
        { role: "assistant", content: reply }
      );

      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }

      showResponse(reply);
      promptInput.value = "";
    } catch (error) {
      console.error("NOVA error:", error);
      showResponse(
        error.message || "Something went wrong. Please try again.",
        true
      );
    } finally {
      setLoading(false);
      promptInput.focus();
    }
  });
}

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!promptInput) return;

    promptInput.value = button.dataset.prompt || "";
    promptInput.focus();
  });
});

document.querySelectorAll("[data-open-preferences]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("preferencesDialog")?.showModal();
  });
});

document.querySelectorAll("[data-close-preferences]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("preferencesDialog")?.close();
  });
});

document.querySelectorAll("[data-home]").forEach((button) => {
  button.addEventListener("click", () => {
    if (promptInput) {
      promptInput.value = "";
      promptInput.focus();
    }

    if (responseBox) {
      responseBox.hidden = true;
      responseBox.textContent = "";
    }
  });
});

console.log("NOVA JavaScript loaded successfully.");

