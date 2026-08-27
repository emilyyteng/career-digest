export type Source = "greenhouse" | "lever" | "ashby";

export type CycleStatus = "target" | "optional" | "stale";

export type CompanyConfig = {
  name: string;
  source: Source;
  boardToken: string;
};

export type NormalizedPosting = {
  source: Source;
  externalId: string;
  title: string;
  location: string | null;
  department: string | null;
  url: string;
  descriptionHtml: string | null;
  isInternship: boolean;
  cycleStatus: CycleStatus | null;
  firstPublishedAt: Date | null;
  sourceUpdatedAt: Date | null;
  raw: unknown;
};
