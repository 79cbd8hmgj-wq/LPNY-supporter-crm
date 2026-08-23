import { interestSlugs, type GetInvolvedInput } from "./schema";

const allowedInterestSlugs = new Set<string>(interestSlugs);

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function readGetInvolvedForm(formElement: HTMLFormElement): GetInvolvedInput {
  const formData = new FormData(formElement);
  const interests = formData
    .getAll("interests")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is GetInvolvedInput["interests"][number] => allowedInterestSlugs.has(value));

  return {
    firstName: readString(formData, "firstName"),
    lastName: readString(formData, "lastName"),
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
    zipCode: readString(formData, "zipCode"),
    interests,
    emailOptIn: formData.has("emailOptIn"),
    phoneOptIn: formData.has("phoneOptIn"),
    website: readString(formData, "website"),
  };
}
