/* global CONFIG */
export default function configureSystemFonts() {
  Object.assign(CONFIG.fontDefinitions, {
    RobotoRegular: {
      editor: true,
      fonts: [
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto-Regular.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto-Regular.ttf",
          ],
          weight: "400", // normal
          style: "normal",
        },
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto-Bold.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto-Bold.ttf",
          ],
          weight: "700", // bold
          style: "normal",
        },
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto-Italic.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto-Italic.ttf",
          ],
          weight: "400", // normal
          style: "italic",
        },
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto-BoldItalic.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto-BoldItalic.ttf",
          ],
          weight: "700", // bold
          style: "italic",
        },
      ],
    },
    RobotoCondensed: {
      editor: true,
      fonts: [
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-Regular.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-Regular.ttf",
          ],
          weight: "400", // normal
          style: "normal",
        },
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-Bold.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-Bold.ttf",
          ],
          weight: "700", // bold
          style: "normal",
        },
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-Italic.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-Italic.ttf",
          ],
          weight: "400", // normal
          style: "italic",
        },
        {
          urls: [
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-BoldItalic.woff2",
            "systems/acks/assets/fonts/Roboto/Roboto_Condensed-BoldItalic.ttf",
          ],
          weight: "700", // bold
          style: "italic",
        },
      ],
    },
    RobotoSlab: {
      editor: true,
      fonts: [
        {
          urls: [
            "systems/acks/assets/fonts/Roboto_Slab/RobotoSlab-Regular.woff2",
            "systems/acks/assets/fonts/Roboto_Slab/RobotoSlab-Regular.ttf",
          ],
          weight: "400", // normal
          style: "normal",
        },
        {
          urls: [
            "systems/acks/assets/fonts/Roboto_Slab/RobotoSlab-Bold.woff2",
            "systems/acks/assets/fonts/Roboto_Slab/RobotoSlab-Bold.ttf",
          ],
          weight: "700", // bold
          style: "normal",
        },
      ],
    },
    AcksSymbols: {
      editor: false,
      fonts: [
        {
          urls: ["systems/acks/assets/fonts/Acks_Symbols/AcksSymbols-Regular.ttf"],
          weight: "400", // normal
          style: "normal",
        },
      ],
    },
  });
}
