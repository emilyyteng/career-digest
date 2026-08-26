export type Source = "greenhouse";

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
  raw: unknown;
};
