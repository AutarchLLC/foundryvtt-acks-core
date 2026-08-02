/* global foundry */

import { DAMAGE_TYPE_CHOICES } from "../../../constants.mjs";

export default class WeaponDamageTemplate {
  static get schema() {
    const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;

    return {
      damage: new SchemaField({
        formula: new StringField({ blank: true, initial: "1d6", label: "Damage Formula" }),
        twoHandFormula: new StringField({ blank: true, initial: "1d8", label: "Two-Handed Damage Formula" }),
        types: new SetField(new StringField({ choices: DAMAGE_TYPE_CHOICES }), { label: "Damage Type" }),
        extraordinary: new BooleanField({ initial: false, label: "Extraordinary" }),
      }),
    };
  }

  /**
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateDamageStringToObject(source) {
    if (foundry.utils.getType(source.damage) === "string") {
      const damageFormula = source.damage;

      source.damage = {
        formula: damageFormula,
        twoHandFormula: "",
        types: [],
        extraordinary: false,
      };
    }
  }
}
