const { DataModel } = foundry.abstract;
const { StringField, BooleanField } = foundry.data.fields;

export class ForgeCharCreatorSettings extends DataModel {
  static defineSchema() {
    return {
      enableWizard: new BooleanField({ initial: true, label: "Enable Character Wizard", hint: "Show the character creator wizard button." }),
      defaultTheme: new StringField({ initial: "dark", choices: ["dark", "light"], label: "Wizard Theme" })
    };
  }
}
