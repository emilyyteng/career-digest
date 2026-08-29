export type Source =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "oracle"
  | "smartrecruiters"
  | "simplify";

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
  firstPublishedAt: Date | null;
  sourceUpdatedAt: Date | null;
  raw: unknown;
};
