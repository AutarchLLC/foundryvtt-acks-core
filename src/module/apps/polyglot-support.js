// Apps hooks
export class AcksPolyglot {
  static init() {
    Hooks.once("polyglot.init", (LanguageProvider) => {
      class acksLanguageProvider extends LanguageProvider {
        requiresReady = true;

        getSystemDefaultLanguage() {
          return "Common Auran";
        }

        async getLanguages() {
          if (this.replaceLanguages) {
            this.languages = {};
            return;
          }
          const demonlordPack = game.packs.get("acks.acks-languages");
          const demonlordItemList = await demonlordPack.getIndex();
          const languagesSetting = game.settings.get("polyglot", "Languages");
          for (let item of demonlordItemList) {
            const originalName = item?.flags?.babele?.originalName || item.name;
            this.languages[originalName] = {
              label: item.name,
              font: languagesSetting[originalName]?.font || this.languages[originalName]?.font || this.defaultFont,
              rng: languagesSetting[originalName]?.rng ?? "default",
            };
          }
        }

        getUserLanguages(actor) {
          let knownLanguages = new Set();
          let literateLanguages = new Set();
          for (let item of actor.items) {
            if (item.type === "language") {
              const name = item?.flags?.babele?.originalName || item.name;
              knownLanguages.add(name);
              if (actor.system.scores.int.value >= 9) {
                literateLanguages.add(name);
              }
            }
          }
          return [knownLanguages, literateLanguages];
        }

        conditions(lang) {
          return game.polyglot.literateLanguages.has(lang);
        }
      }
      game.polyglot.api.registerSystem(acksLanguageProvider);
    });
  }
}
