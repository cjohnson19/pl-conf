export type EventPreferences = {
  hidden: boolean | undefined;
  favorite: boolean | undefined;
};

export type PreferenceCollection = {
  [id: string]: EventPreferences;
};
