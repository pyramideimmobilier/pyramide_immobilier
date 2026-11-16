type ListingTitleInput = {
  propertyType: string;
  propertyTypeCustom?: string;
  location?: {
    city?: string;
    district?: string;
    address?: string;
  };
  features?: {
    layoutNotation?: "F" | "T";
    roomCount?: number;
    furnished?: boolean;
  };
};

export function generateListingTitle(input: ListingTitleInput): string {
  const propertyType =
    input.propertyType === "Autre"
      ? input.propertyTypeCustom?.trim() || "Bien immobilier"
      : input.propertyType.trim() || "Bien immobilier";
  const layout =
    input.propertyType === "Appartement" && input.features?.roomCount
      ? ` ${input.features.layoutNotation ?? "F"}${input.features.roomCount}`
      : "";
  const femininePropertyTypes = ["Villa", "Maison"];
  const furnished = input.features?.furnished
    ? femininePropertyTypes.includes(input.propertyType)
      ? " équipée"
      : " équipé"
    : "";
  const location =
    input.location?.district?.trim() ||
    input.location?.address?.trim() ||
    input.location?.city?.trim();

  return `${propertyType}${layout}${furnished}${location ? ` à ${location}` : ""}`;
}
