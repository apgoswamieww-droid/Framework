export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    if (
      !Number.isInteger(statusCode) ||
      statusCode < 400 ||
      statusCode > 599
    ) {
      throw new RangeError("Invalid HTTP error status code.");
    }

    super(message);

    this.name = "HttpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}