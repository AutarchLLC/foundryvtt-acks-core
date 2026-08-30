/* global foundry */
import BaseDataModel from "../common/base-data-model.mjs";

export default class ItemBaseData extends BaseDataModel {
  async prepareChatCardContext() {
    return {
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description ?? ""),
      buttons: [],
      tags: [],
    };
  }
}
