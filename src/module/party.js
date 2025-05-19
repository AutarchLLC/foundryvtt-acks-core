import { AcksPartySheet } from "./dialog/party-sheet.js";

export const showPartySheet = (object) => {
  new AcksPartySheet(object, {
    top: window.screen.height / 2 - 180,
    left: window.screen.width / 2 - 140,
  }).render(true);
};

export const update = (actor, data) => {
  if (actor.getFlag("acks", "party")) {
    Object.values(ui.windows).forEach((w) => {
      if (w instanceof AcksPartySheet) {
        w.render(true);
      }
    });
  }
};
