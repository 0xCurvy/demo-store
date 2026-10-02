/** A problem the shop can explain to the caller. The HTTP layer turns it into a JSON error. */
export class ShopError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ShopError";
  }
}

/** The shop's settings are incomplete, so it cannot take payments yet. */
export class SetupError extends ShopError {
  constructor(readonly problems: string[]) {
    super(503, "the shop is not set up yet", "NOT_SET_UP");
    this.name = "SetupError";
  }
}
