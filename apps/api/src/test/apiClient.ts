import supertest from "supertest";
import { createApp } from "../app.js";

export function apiClient(): supertest.SuperTest<supertest.Test> {
  return supertest(createApp());
}
