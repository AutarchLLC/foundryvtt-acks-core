export const ACKS = {
  statusEffects : [
    { acks: true, id: "surprised", label: 'Surprised', icon: 'systems/acks/assets/icons/surprised.svg', duration: {rounds: 1} },
    { acks: true, id: "overnumbering", label: 'OverNumbered', icon: 'icons/svg/regen.svg' },
    { acks: true, id: "done", label: 'Done', icon: 'icons/svg/cancel.svg' },
    { acks: true, id: "readied", label: 'Readied', icon: 'icons/svg/ice-aura.svg' },
    { acks: true, id: "delayed", label: 'Delayed', icon: 'icons/svg/clockwork.svg' },
    { acks: true, id: "slumbering", label: 'Slumbering', icon: 'icons/svg/stoned.svg' },
  ],
  surpriseTableAdventurers : {
    "forelos": {
      "forelos": {monsterModifier: +10, adventurerModifier: +10, canEvade: false, description: "ACKS.surprise.forelos.forelos"},
      "fore": {monsterModifier: 1, adventurerModifier: +10, canEvade: true, description: "ACKS.surprise.forelos.fore"},
      "los": {monsterModifier: 0, adventurerModifier: +10, canEvade: true, description: "ACKS.surprise.forelos.los"},
      "none": {monsterModifier: -1, adventurerModifier: +10, canEvade: true, description: "ACKS.surprise.forelos.none"}
    },
    "fore": {
      "forelos": {monsterModifier: 10, adventurerModifier: +1, canEvade: false, description: "ACKS.surprise.fore.forelos"},
      "fore": {monsterModifier: 1, adventurerModifier: 1, canEvade: true, description: "ACKS.surprise.fore.fore"},
      "los": {monsterModifier: 0, adventurerModifier: 1, canEvade: true, description: "ACKS.surprise.fore.los"},
      "none": {monsterModifier: -1, adventurerModifier: 1, canEvade: true, description: "ACKS.surprise.fore.none"}
    },
    "los": {
      "forelos": {monsterModifier: 10, adventurerModifier: 0, canEvade: false, description: "ACKS.surprise.los.forelos"},
      "fore": {monsterModifier: 1, adventurerModifier: 0, canEvade: true, description: "ACKS.surprise.los.fore"},
      "los": {monsterModifier: 0, adventurerModifier: 0, canEvade: true, description: "ACKS.surprise.los.los"},
      "none": {monsterModifier: -1, adventurerModifier: 0, canEvade: true, description: "ACKS.surprise.los.none"}
    },
    "none": {
      "forelos": {monsterModifier: 10, adventurerModifier: -1, canEvade: false, description: "ACKS.surprise.none.forelos"},
      "fore": {monsterModifier: 1, adventurerModifier: -1, canEvade: false, description: "ACKS.surprise.none.fore"},
      "los": {monsterModifier: 0, adventurerModifier: -1, canEvade: false, description: "ACKS.surprise.none.los"},
      "none": {monsterModifier: -10, adventurerModifier: -10, canEvade: false, description: "ACKS.surprise.none.none"}
    }
  },
  scores: {
    str: "ACKS.scores.str.long",
    int: "ACKS.scores.int.long",
    dex: "ACKS.scores.dex.long",
    wis: "ACKS.scores.wis.long",
    con: "ACKS.scores.con.long",
    cha: "ACKS.scores.cha.long",
  },
  roll_type: {
    result: "=",
    above: "≥",
    below: "≤"
  },
  saves_short: {
    death: "ACKS.saves.death.short",
    wand: "ACKS.saves.wand.short",
    paralysis: "ACKS.saves.paralysis.short",
    breath: "ACKS.saves.breath.short",
    spell: "ACKS.saves.spell.short",
  },
  saves_long: {
    death: "ACKS.saves.death.long",
    wand: "ACKS.saves.wand.long",
    paralysis: "ACKS.saves.paralysis.long",
    breath: "ACKS.saves.breath.long",
    spell: "ACKS.saves.spell.long",
  },
  armor : {
    unarmored: "ACKS.armor.unarmored",
    light: "ACKS.armor.light",
    heavy: "ACKS.armor.heavy",
    shield: "ACKS.armor.shield",
  },
  colors: {
    green: "ACKS.colors.green",
    red: "ACKS.colors.red",
    yellow: "ACKS.colors.yellow",
    purple: "ACKS.colors.purple",
    blue: "ACKS.colors.blue",
    orange: "ACKS.colors.orange",
    white: "ACKS.colors.white"
  },
  proficiencyType: {
    "general": "ACKS.proficiencyType.general",
    "class": "ACKS.proficiencyType.class",
  },
  tags: {
    melee: "ACKS.items.Melee",
    missile: "ACKS.items.Missile",
    slow: "ACKS.items.Slow",
    twohanded: "ACKS.items.TwoHanded",
    blunt: "ACKS.items.Blunt",
    brace: "ACKS.items.Brace",
    splash: "ACKS.items.Splash",
    reload: "ACKS.items.Reload",
    charge: "ACKS.items.Charge",
  },
  tag_images: {
    melee: "systems/acks/assets/melee.png",
    missile: "systems/acks/assets/missile.png",
    slow: "systems/acks/assets/slow.png",
    twohanded: "systems/acks/assets/twohanded.png",
    blunt: "systems/acks/assets/blunt.png",
    brace: "systems/acks/assets/brace.png",
    splash: "systems/acks/assets/splash.png",
    reload: "systems/acks/assets/reload.png",
    charge: "systems/acks/assets/charge.png",
  },
  hireling_categories: {
    henchman: "ACKS.hireling.henchman",
    mercenary: "ACKS.hireling.mercenary",
    specialist: "ACKS.hireling.specialist"
  },
  item_subtypes: {
    item: "ACKS.items.item",
    clothing: "ACKS.items.clothing"
  },
  monster_saves: {
    0: {
      label: "Normal Human",
      d: 15,
      w: 17,
      p: 14,
      b: 16,
      s: 18
    },
    1: {
      label: "1",
      d: 14,
      w: 16,
      p: 13,
      b: 15,
      s: 17
    },
    2: {
      label: "2-3",
      d: 13,
      w: 15,
      p: 12,
      b: 14,
      s: 16
    },
    4: {
      label: "4",
      d: 12,
      w: 14,
      p: 11,
      b: 13,
      s: 15
    },
    5: {
      label: "5-6",
      d: 11,
      w: 13,
      p: 10,
      b: 12,
      s: 14
    },
    7: {
      label: "7",
      d: 10,
      w: 12,
      p: 9,
      b: 11,
      s: 13
    },
    8: {
      label: "8-9",
      d: 9,
      w: 11,
      p: 8,
      b: 10,
      s: 12
    },
    10: {
      label: "10",
      d: 8,
      w: 10,
      p: 7,
      b: 9,
      s: 11
    },
    11: {
      label: "11-12",
      d: 7,
      w: 9,
      p: 6,
      b: 8,
      s: 10
    },
    13: {
      label: "13",
      d: 6,
      w: 8,
      p: 5,
      b: 7,
      s: 9
    },
    14: {
      label: "14+",
      d: 5,
      w: 7,
      p: 4,
      b: 6,
      s: 8
    },
  },
  base_speed: {
    unencumbered: 120,
    low_encumbrance: 90,
    mid_encumbrance: 60,
    high_encumbrance: 30,
    overburdened: 0
  },
};
