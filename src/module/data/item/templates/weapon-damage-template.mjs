/* global foundry */

import { DAMAGE_TYPE_CHOICES } from "../../../constants.mjs";

export default class WeaponDamageTemplate {
  static get schema() {
    const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;

    return {
      damage: new SchemaField({
        base: new SchemaField({
          formula: new StringField({ blank: true, initial: "1d6", label: "Damage Formula" }),
          types: new SetField(new StringField({ choices: DAMAGE_TYPE_CHOICES }), { label: "Damage Type" }),
          extraordinary: new BooleanField({ initial: false, label: "Extraordinary" }),
        }),
        alternate: new SchemaField({
          formula: new StringField({ blank: true, initial: "", label: "Damage Formula" }),
          types: new SetField(new StringField({ choices: DAMAGE_TYPE_CHOICES }), { label: "Damage Type" }),
          extraordinary: new BooleanField({ initial: false, label: "Extraordinary" }),
        }),
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
        base: {
          formula: damageFormula,
          types: [],
          extraordinary: false,
        },
        alternate: {
          formula: "",
          types: [],
          extraordinary: false,
        },
      };
    }
  }
}
