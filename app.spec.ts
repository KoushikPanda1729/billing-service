import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import { calculateSum } from "./src/utils";
import app from "./src/app";

describe("app", () => {
    it("should return correct discount ammount", () => {
        const sum = calculateSum(10, 10);
        expect(sum).toBe(20);
    });

    it("should return 200 status code ", async () => {
        const response = await request(app).get("/").send();
        expect(response.statusCode).toBe(200);
    });
});
