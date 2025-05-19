import { AcksTableManager } from "../apps/table-manager.js";
import { AcksUtility } from "../utility.js";

export class AcksTamperingDialog extends FormApplication {
  /* -------------------------------------------- */
  /*   * @param {object} tamperingData - The data object containing the values for the dialog.
   *  *   @returns {number} - The final modifier for the mortal wounds roll.
   * -------------------------------------------- */
  updateDialogResult(tamperingData) {
    let finalModifier = 0;
    finalModifier += Number(tamperingData.willModifier);
    finalModifier += Number(tamperingData.creatureLife);
    finalModifier += Number(AcksUtility.roundToEven(tamperingData.spellcasterLevel / 2));
    let bodyModifier = tamperingData.stillAlive ? 5 : 0;
    bodyModifier += tamperingData.instantKilled ? -10 : 0;
    bodyModifier += Number(tamperingData.spine);
    bodyModifier += Number(tamperingData.limbsDestroyed);
    bodyModifier += Number(-tamperingData.organsDestroyed);
    if (bodyModifier < -10) {
      // Penalty for too many body parts destroyed is capped at -10
      bodyModifier = -10;
    }
    finalModifier += bodyModifier;
    finalModifier += Number(-tamperingData.daysSinceDeath);
    finalModifier += Number(-tamperingData.sideEffects);
    finalModifier += tamperingData.castTemple ? 2 : 0;

    $("input[name='finalModifierValue']").val(finalModifier);
    return finalModifier;
  }

  /* -------------------------------------------- */
  buildTamperingTablesChoices() {
    let tables = game.acks.tables?.tampering;
    if (!tables) {
      console.error("No tampering tables found");
      return [];
    }
    let choices = [];
    // tables is an object with keys as table names and values as table objects
    for (let [key, data] of Object.entries(tables)) {
      choices.push({ key: key, label: data.name });
    }
    return choices;
  }

  chooseAlignment(actor) {
    if (!actor) {
      return "tampering_neutral";
    }
    let alignment = actor.system?.details?.alignment?.toLowerCase() || "neutral";
    console.log("Actor Alignment", actor, alignment);
    if (alignment === "lawful") {
      return "tampering_lawful";
    } else if (alignment === "chaotic") {
      return "tampering_chaotic";
    } else if (alignment === "neutral") {
      return "tampering_neutral";
    } else {
      console.log("Unknown alignment", actor.name, alignment);
      return "tampering_neutral";
    }
  }

  /* -------------------------------------------- */
  async init(actor = undefined, tamperingData = undefined) {
    if (!tamperingData) {
      tamperingData = {
        title: "Roll Tampering with Mortality",
        willModifier: actor?.getWillModifier() || 0,
        tamperingChoices: this.buildTamperingTablesChoices(),
        tamperingChoice: this.chooseAlignment(actor),
        spanChoices: CONFIG.ACKS.tampering_span,
        classLevelChoices: CONFIG.ACKS.mortal_class_levels,
        spineChoices: CONFIG.ACKS.tampering_spine,
        limbsChoices: CONFIG.ACKS.tampering_limbs,
        creatureLife: 2,
        spellcasterLevel: 1,
        castTemple: false,
        stillAlive: false,
        instantKilled: false,
        spine: 0,
        limbsDestroyed: 0,
        organsDestroyed: 0,
        freeModifier: 0,
        daysSinceDeath: 0,
        sideEffects: 0,
        finalModifier: 0,
      };
    }
    tamperingData.finalModifier = this.updateDialogResult(tamperingData);
    console.log("Tampering Data", tamperingData);

    let content = await renderTemplate("systems/acks/templates/apps/tampering-mortality-dialog.html", tamperingData);

    const dialogContext = await foundry.applications.api.DialogV2.wait({
      window: { title: tamperingData.title },
      classes: ["acks", "dialog", "party-sheet", "app", "window-app"],
      content,
      rejectClose: false,
      buttons: [
        {
          action: "roll",
          label: "Roll Tampering with Mortality",
          default: true,
          callback: (event, button, dialog) => {
            const output = Array.from(button.form.elements).reduce((obj, input) => {
              if (input.name) obj[input.name] = input.value;
              return obj;
            }, {});
            return output;
          },
        },
        {
          action: "close",
          label: "Close",
          callback: (event, button, dialog) => {
            return null;
          },
        },
      ],
      actions: {
        "still-alive": (event, button, dialog) => {
          tamperingData.stillAlive = !tamperingData.stillAlive;
          this.updateDialogResult(tamperingData);
        },
        "instant-killed": (event, button, dialog) => {
          tamperingData.instantKilled = !tamperingData.instantKilled;
          this.updateDialogResult(tamperingData);
        },
        "cast-temple": (event, button, dialog) => {
          tamperingData.castTemple = !tamperingData.castTemple;
          this.updateDialogResult(tamperingData);
        },
      },
      render: (event, dialog) => {
        $(".will-modifier").change((event) => {
          tamperingData.willModifier = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".free-modifier").change((event) => {
          tamperingData.freeModifier = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".creature-life").change((event) => {
          tamperingData.creatureLife = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".spellcaster-level").change((event) => {
          tamperingData.spellcasterLevel = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".spine-severed").change((event) => {
          tamperingData.spine = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".limbs-destroyed").change((event) => {
          tamperingData.limbsDestroyed = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".organs-destroyed").change((event) => {
          tamperingData.organsDestroyed = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".days-since-death").change((event) => {
          tamperingData.daysSinceDeath = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
        $(".side-effects").change((event) => {
          tamperingData.sideEffects = Number(event.target.value);
          this.updateDialogResult(tamperingData);
        });
      },
    });

    if (dialogContext == null) {
      return;
    }

    tamperingData.tamperingChoice = dialogContext.tamperingChoice;

    // Get the final result from the dialog
    let modifier = this.updateDialogResult(tamperingData);
    let tableKey = dialogContext.tamperingChoice;
    let rollResult = await AcksTableManager.rollD20Table("tampering", tableKey, modifier);
    console.log("Roll Result", rollResult);

    let chatContent = await renderTemplate("systems/acks/templates/chat/tampering-result.html", rollResult);
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: chatContent,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: {
        acks: {
          tampering: true,
          rollResult: rollResult,
        },
      },
    };
    ChatMessage.create(chatData).then((msg) => {
      console.log("Chat Message Created", msg);
    });

    // Re-opens the dialog window and keep the data
    setTimeout(() => {
      let d = new AcksTamperingDialog();
      d.init(actor, tamperingData);
    }, 500);

    return dialogContext;
  }
}
