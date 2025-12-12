import { logger } from "@/utils/logger";

describe("Logger Service", () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should call console.log when logger.log is used", () => {
        logger.log("test message");
        expect(consoleLogSpy).toHaveBeenCalledWith("test message");
    });

    it("should call console.error when logger.error is used", () => {
        const err = new Error("test error");
        logger.error("error message", err);
        expect(consoleErrorSpy).toHaveBeenCalledWith("error message", err);
    });
});
