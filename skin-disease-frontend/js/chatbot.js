(function () {
  let chatState = "idle";
  let currentDisease = "";

  if (window.SkinCareAIChatbotInitialized) return;
  window.SkinCareAIChatbotInitialized = true;

  /* =========================
     DISEASE INFORMATION
     ========================= */

  const diseaseInfo = {
    eczema: `Eczema is a skin condition that causes dryness, redness, and itching.
It is often triggered by allergens, stress, or weather changes.
The condition is not contagious and may recur over time.`,

    melanoma: `Melanoma is a serious type of skin cancer that develops from pigment-producing cells.
It often appears as a new or changing mole with irregular shape or color.
Early detection greatly improves treatment outcomes.`,

    "atopic dermatitis": `Atopic dermatitis is a chronic inflammatory skin condition.
It commonly causes itchy, dry, and inflamed skin.
Symptoms may worsen due to allergens or environmental factors.`,

    "basal cell carcinoma": `Basal cell carcinoma (BCC) is a common form of skin cancer caused by sun exposure.
It usually grows slowly and rarely spreads.
Early treatment prevents skin damage.`,

    bcc: `Basal cell carcinoma (BCC) is a common form of skin cancer caused by sun exposure.
It usually grows slowly and rarely spreads.
Early treatment prevents skin damage.`,

    "melanocytic nevi": `Melanocytic nevi are commonly known as moles.
They are usually harmless skin growths.
Any change in size, shape, or color should be examined.`,

    nv: `Melanocytic nevi are commonly known as moles.
They are usually harmless skin growths.
Any change in size, shape, or color should be examined.`,

    bkl: `Benign keratosis-like lesions are non-cancerous skin growths.
They may appear rough, scaly, or wart-like.
These lesions are usually harmless.`,

    "benign keratosis": `Benign keratosis-like lesions are non-cancerous skin growths.
They may appear rough, scaly, or wart-like.
These lesions are usually harmless.`,

    psoriasis: `Psoriasis is an autoimmune skin condition that causes thick, scaly patches.
It commonly affects the scalp, elbows, and knees.
Symptoms may flare and subside over time.`,

    "lichen planus": `Lichen planus is an inflammatory skin condition that causes itchy, flat bumps.
It may affect skin, nails, or mouth.
The condition is not contagious.`,

    "seborrheic keratosis": `Seborrheic keratoses are benign skin growths that appear with aging.
They often look waxy or wart-like.
They are not cancerous.`,

    tinea: `Tinea is a fungal skin infection that causes itchy, circular rashes.
It spreads through contact and thrives in moist areas.
Proper hygiene helps prevent infection.`,

    ringworm: `Ringworm is a fungal infection causing ring-shaped itchy rashes.
It is contagious but treatable.
It commonly affects skin, scalp, or feet.`,

    candidiasis: `Candidiasis is a fungal infection caused by yeast.
It often affects moist areas of the skin.
It can cause redness, itching, and discomfort.`,

    warts: `Warts are caused by viral infections of the skin.
They appear as rough, raised growths.
They can spread through direct contact.`,

    molluscum: `Molluscum contagiosum is a viral skin infection.
It causes small, flesh-colored bumps.
The condition is contagious but usually harmless.`
  };

  /* =========================
     REMEDIES
     ========================= */

  const diseaseRemedies = {
    melanoma: [
      "Avoid direct sun exposure",
      "Use broad-spectrum sunscreen (SPF 30+)",
      "Do not scratch or self-treat lesions",
      "Monitor moles for changes",
      "Wear protective clothing",
      "Consult a dermatologist immediately"
    ],

    eczema: [
      "Moisturize skin regularly",
      "Avoid harsh soaps",
      "Use lukewarm water for bathing",
      "Identify and avoid triggers",
      "Wear soft cotton clothing",
      "Consult a dermatologist if severe"
    ],

    psoriasis: [
      "Keep skin moisturized",
      "Avoid scratching",
      "Manage stress",
      "Use mild skincare products",
      "Get moderate sunlight",
      "Consult a dermatologist for flare-ups"
    ]
  };

  const genericRemedies = [
    "Avoid scratching or irritating the skin",
    "Keep the affected area clean and dry",
    "Use gentle, fragrance-free skincare products",
    "Avoid known triggers",
    "Maintain good hydration",
    "Consult a dermatologist if symptoms persist"
  ];

  /* =========================
     CHAT UI
     ========================= */

  const createButton = () => {
    const btn = document.createElement("div");
    btn.id = "scai-chatbot-button";
    btn.innerHTML = `
      <div class="scai-btn-glow"></div>
      <div class="scai-btn-core">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3c-4.4 0-8 3.2-8 7.2 0 2.4 1.4 4.6 3.6 5.9v3.2l3-2c.5.1 1 .1 1.4.1 4.4 0 8-3.2 8-7.2S16.4 3 12 3zm-3.2 7.6a1 1 0 110-2 1 1 0 010 2zm3.2 0a1 1 0 110-2 1 1 0 010 2zm3.2 0a1 1 0 110-2 1 1 0 010 2z"/>
        </svg>
      </div>
    `;
    return btn;
  };

  const createPanel = () => {
    const panel = document.createElement("div");
    panel.id = "scai-chatbot-panel";
    panel.innerHTML = `
      <div class="scai-chatbot-header">
        <div class="scai-chatbot-title-wrap">
          <div class="scai-chatbot-title">SkinCare AI Assistant</div>
          <div class="scai-chatbot-subtitle">Medical Support Bot</div>
        </div>
        <div class="scai-chatbot-actions">
          <button type="button" id="scai-clear-chat">Clear</button>
          <button type="button" id="scai-close-chat" aria-label="Close">×</button>
        </div>
      </div>
      <div class="scai-chatbot-disclaimer">
        This chatbot provides educational information only and is not a medical diagnosis.
      </div>
      <div class="scai-chatbot-messages" id="scai-messages"></div>
      <div class="scai-chatbot-input">
        <input type="text" id="scai-input" placeholder="Ask about symptoms, care, or precautions" />
        <button type="button" id="scai-send">Send</button>
      </div>
    `;
    return panel;
  };

  const createMessage = (container, role, html) => {
    const msg = document.createElement("div");
    msg.className = `scai-message ${role}`;
    msg.innerHTML = html;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  };

  const init = () => {
    const button = createButton();
    const panel = createPanel();
    document.body.appendChild(button);
    document.body.appendChild(panel);

    const messages = panel.querySelector("#scai-messages");
    const input = panel.querySelector("#scai-input");
    const sendBtn = panel.querySelector("#scai-send");
    const closeBtn = panel.querySelector("#scai-close-chat");
    const clearBtn = panel.querySelector("#scai-clear-chat");

    if (!panel || !messages || !input || !sendBtn) return;

    button.addEventListener("click", () => {
      panel.classList.toggle("open");
    });
    closeBtn.addEventListener("click", () => panel.classList.remove("open"));
    clearBtn.addEventListener("click", () => {
      messages.innerHTML = "";
    });

  const handleUserMessage = (text) => {
    const inputText = text.toLowerCase().trim();
    const wantsRemedies = /\b(yes|remedy|remedies|precaution|care|tips)\b/.test(inputText);

    if (chatState === "idle") {
      currentDisease = inputText;
      chatState = "askedRemedies";

      const info =
        diseaseInfo[inputText] ||
        `${inputText.charAt(0).toUpperCase() + inputText.slice(1)} is a skin condition that may affect the skin's appearance or comfort.
Symptoms and causes can vary between individuals.
A medical professional can provide accurate diagnosis.`;

      createMessage(
        messages,
        "bot",
        `${info.replace(/\n/g, "<br>")}<br><br>This information is educational only and does not replace professional medical advice. Would you like to know about remedies, precautions, or care tips?`
      );
      return;
    }

    if (chatState === "askedRemedies" && wantsRemedies) {
      chatState = "idle";

      const remediesList =
        diseaseRemedies[currentDisease] || genericRemedies;

      const remediesHtml = remediesList
        .map(r => `• ${r}`)
        .join("<br>");

      createMessage(
        messages,
        "bot",
        `Here are general care and precautionary steps:<br><br>${remediesHtml}<br><br>This is educational guidance only. For personalized care, please consult a dermatologist.`
      );
      return;
    }

    createMessage(
      messages,
      "bot",
      "Please enter a skin disease name to continue, or type “remedies” if you would like care guidance."
    );
  };

    sendBtn.addEventListener("click", () => {
      const text = input.value.trim();
      if (!text) return;
      createMessage(messages, "user", text);
      input.value = "";
      setTimeout(() => handleUserMessage(text), 400);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendBtn.click();
    });
  };

  document.addEventListener("DOMContentLoaded", init);
})();
