import AcksPartyOverviewApp from "./apps/party-overview-app.mjs";

export const showPartySheet = () => {
  //TODO: make it so it does not open second instance if it is already open
  new AcksPartyOverviewApp().render(true);
};
