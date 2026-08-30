/* global foundry */

import { DAMAGE_TYPE } from "../../../constants.mjs";

export default class WeaponCustomTagsTemplate {
  static get schema() {
    const { SetField, StringField } = foundry.data.fields;

    return {
      customTags: new SetField(new StringField({ blank: false }), {
        label: "Custom Tags",
        placeholder: "Enter custom tag",
      }),
    };
  }

  /**
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateTags(source) {
    if (source.tags && Array.isArray(source.tags)) {
      const customTagsSet = new Set(source.customTags);

      for (const tag of source.tags) {
        const customTag = tag.value;
        customTagsSet.add(customTag);

        const cTag = customTag.toLowerCase();
        this.#tryToMigrateTagToSpecialProperty(cTag, source);
      }

      source.customTags = Array.from(customTagsSet);
    }
  }

  static #tryToMigrateTagToSpecialProperty(tag, source) {
    // special tags
    if (foundry.utils.hasProperty(source, `special.${tag}`)) {
      foundry.utils.setProperty(source, `special.${tag}`, true);
    }

    // edge case for cleave
    const cleaveMatch = tag.match(/^cleave\s*(\d+)?$/i);
    if (cleaveMatch) {
      foundry.utils.setProperty(source, `special.cleave`, true);

      const cleaveLimit = cleaveMatch[1] ? parseInt(cleaveMatch[1], 10) : 2;
      foundry.utils.setProperty(source, `cleaveLimit.numeric`, cleaveLimit);
    }

    // melee
    if (/mel+e+/i.test(tag)) {
      foundry.utils.setProperty(source, "melee", true);
    }

    // missile or ranged
    if (/mis+i[le]{2,}|ran[gj]e?d?/i.test(tag)) {
      foundry.utils.setProperty(source, "missile", true);
    }

    // damage types
    const damageTypes = new Set(foundry.utils.getProperty(source, "damage.types") ?? []);
    if (/\bacid/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.ACIDIC);
    } else if (/\barcan/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.ARCANE);
    } else if (/\bbludg/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.BLUDGEONING);
    } else if (/\bpierc/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.PIERCING);
    } else if (/\bpoison/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.POISONOUS);
    } else if (/\bslash/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.SLASHING);
    } else if (/\bcold/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.COLD);
    } else if (/\belectr/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.ELECTRICAL);
    } else if (/\bfire/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.FIRE);
    } else if (/\blumin/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.LUMINOUS);
    } else if (/\bnecro/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.NECROTIC);
    } else if (/\bseism/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.SEISMIC);
    } else if (/\bvarie/i.test(tag)) {
      damageTypes.add(DAMAGE_TYPE.VARIES_BY_WEAPON);
    }
    foundry.utils.setProperty(source, "damage.types", Array.from(damageTypes));

    // extraordinary damage
    if (/\b(extrao|magic)/i.test(tag)) {
      foundry.utils.setProperty(source, "damage.extraordinary", true);
    }
  }
}
