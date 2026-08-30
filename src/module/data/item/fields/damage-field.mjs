/* global foundry, game */
import { DAMAGE_TYPE_CHOICES, DAMAGE_TYPE_ICON } from "../../../constants.mjs";

const { BooleanField, SetField, StringField } = foundry.data.fields;

export default class DamageField extends foundry.data.fields.EmbeddedDataField {
  constructor(options) {
    super(DamageData, options);
  }
}

export class DamageData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      formula: new StringField({ blank: true, initial: "1d6", label: "Damage Formula" }),
      types: new SetField(new StringField({ choices: DAMAGE_TYPE_CHOICES }), { label: "Damage Type" }),
      extraordinary: new BooleanField({ initial: false, label: "Extraordinary" }),
    };
  }

  //region DERIVED PROPERTIES

  /** @override */
  prepareDerivedData() {
    this.icons = this.types.map((damageType) => {
      const classes = `${DAMAGE_TYPE_ICON[damageType]} ${this.extraordinary ? "acks-icon-extraordinary" : ""}`;
      const tooltip = `${game.i18n.localize(DAMAGE_TYPE_CHOICES[damageType])}${this.extraordinary ? ` (${game.i18n.localize("ACKS.damage.label.extraordinary")})` : ""}`;
      return { classes, tooltip };
    });
  }

  //endregion DERIVED PROPERTIES
}
