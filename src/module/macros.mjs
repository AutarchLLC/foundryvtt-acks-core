/* global game, ui, foundry, Macro, Item, CONST */

export async function rollItem(itemUuid, { _event } = {}) {
  const item = await foundry.utils.fromUuid(itemUuid);
  if (!item) {
    ui.notifications.error("Can't find Item.");
    return null;
  }
  item.use();
}

export async function createACKSMacro(data, slot) {
  const item = await Item.implementation.fromDropData(data);
  if (!item) {
    ui.notifications.error("Can't find Item.");
    return null;
  }
  if (!item.actor) {
    ui.notifications.error("Can only create Macro buttons for Items owned by an Actor.");
    return null;
  }
  if (item.inCompendium) {
    ui.notifications.error("Can't create Macro buttons for Items in Compendium.");
    return null;
  }

  const macroData = { type: CONST.MACRO_TYPES.SCRIPT, scope: "actor" };
  foundry.utils.mergeObject(macroData, {
    name: item.name,
    img: item.img,
    command: `game.acks.macro.rollItem("${item.uuid}", { event })`,
    flags: { "acks.itemMacro": true },
  });

  let macro = game.macros.find((m) => {
    return m.name === macroData.name && m.command === macroData.command && m.isAuthor;
  });
  if (!macro) {
    macro = await Macro.create(macroData);
  }
  game.user.assignHotbarMacro(macro, slot);
}
