import { describe, expect, it } from "vitest";
import {
  isExpiredInternTerm,
  looksLikeInternship,
  shouldInsertPosting,
  shouldKeepExistingOnBoard,
} from "./filter.js";

describe("looksLikeInternship", () => {
  it("matches intern and co-op titles", () => {
    expect(looksLikeInternship("Software Engineer Intern")).toBe(true);
    expect(looksLikeInternship("SWE Co-op")).toBe(true);
    expect(looksLikeInternship("Summer Internship")).toBe(true);
  });

  it("matches finance-style seasonal analyst titles", () => {
    expect(looksLikeInternship("Summer Analyst")).toBe(true);
    expect(looksLikeInternship("Technology Summer Analyst")).toBe(true);
    expect(looksLikeInternship("Software Engineering Summer Analyst")).toBe(true);
    expect(looksLikeInternship("Spring Analyst")).toBe(true);
    expect(looksLikeInternship("Summer Associate")).toBe(true);
  });

  it("does not match internal or full-time analyst titles", () => {
    expect(looksLikeInternship("Internal Tools Engineer")).toBe(false);
    expect(looksLikeInternship("International Analyst")).toBe(false);
    expect(looksLikeInternship("Investment Banking Analyst")).toBe(false);
    expect(looksLikeInternship("Senior Analyst")).toBe(false);
  });
});

describe("isExpiredInternTerm", () => {
  it("treats stale summer/spring prior-year titles as expired", () => {
    expect(isExpiredInternTerm("Summer 2026 Software Engineer Intern")).toBe(true);
    expect(isExpiredInternTerm("Spring 2026 Intern")).toBe(true);
  });

  it("allows target and unspecified terms", () => {
    expect(isExpiredInternTerm("Summer 2027 Intern")).toBe(false);
    expect(isExpiredInternTerm("Software Engineer Intern")).toBe(false);
    expect(isExpiredInternTerm("Fall 2026 Intern")).toBe(false);
  });
});

describe("shouldInsertPosting", () => {
  it("requires intern title, valid term, and US-allowed location", () => {
    expect(shouldInsertPosting("Summer 2027 Intern", "San Francisco, CA")).toBe(true);
    expect(shouldInsertPosting("Software Engineer", "San Francisco, CA")).toBe(false);
    expect(shouldInsertPosting("Summer 2026 Intern", "San Francisco, CA")).toBe(false);
    expect(shouldInsertPosting("Summer 2027 Intern", "London, UK")).toBe(false);
  });
});

describe("shouldKeepExistingOnBoard", () => {
  it("mirrors insert rules for retention", () => {
    expect(shouldKeepExistingOnBoard("Summer 2027 Intern", "Remote US")).toBe(true);
    expect(shouldKeepExistingOnBoard("Senior Analyst", "New York, NY")).toBe(false);
  });
});
