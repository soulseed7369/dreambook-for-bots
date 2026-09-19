import { NextResponse } from "next/server";
import { ReadCapacityError } from "./read-cache";

export function withReadCapacity<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try { return await handler(...args); }
    catch (error) {
      if (!(error instanceof ReadCapacityError)) throw error;
      return NextResponse.json({ error: "Reading is temporarily busy. Please retry shortly.", code: "READ_CAPACITY", retryAfter: error.retryAfterSeconds }, {
        status: 503, headers: { "Retry-After": String(error.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }
  };
}
