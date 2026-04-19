import CharacterMortalWoundsApp from "../apps/character-mortal-wounds-app.mjs";
import CharacterTamperingMortalityApp from "../apps/character-tampering-mortality-app.mjs";

export default function renderActorDirectory(app, html, _data) {
  // TODO: move buttons to Toolbar. Maybe create separate category for ACKS tools?
  const button = document.createElement("button");
  button.style.width = "45%";
  button.innerHTML = "Mortal Wounds";
  button.addEventListener("click", () => {
    return new CharacterMortalWoundsApp().render(true);
  });
  const buttonTampering = document.createElement("button");
  buttonTampering.style.width = "45%";
  buttonTampering.innerHTML = "Tampering";
  buttonTampering.addEventListener("click", () => {
    return new CharacterTamperingMortalityApp().render(true);
  });
  const $html = $(html);
  $html.find(".header-actions").after(buttonTampering);
  $html.find(".header-actions").after(button);
}
