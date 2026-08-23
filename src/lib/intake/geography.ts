import zipcodes from "zipcodes-us";

export type ZipGeography = {
  zipCode: string;
  municipality: string | null;
  countyName: string | null;
  isNewYork: boolean;
};

export class InvalidZipError extends Error {
  constructor() {
    super("Invalid ZIP code");
    this.name = "InvalidZipError";
  }
}

export function resolveZipGeography(zipCode: string): ZipGeography {
  const info = zipcodes.find(zipCode);
  if (!info.isValid) throw new InvalidZipError();

  const isNewYork = info.stateCode === "NY";
  return {
    zipCode,
    municipality: info.city || null,
    countyName: isNewYork && info.county ? info.county : null,
    isNewYork,
  };
}
