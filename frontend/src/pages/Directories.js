import { Directory } from "@/components/Directory";
import { IMAGES } from "@/lib/constants";

export function LocalResources() {
  return (
    <Directory type="resource" title="Local resources" image={IMAGES.landscape}
      intro="Food, housing, youth programs, health and crisis support for families in Klamath County." />
  );
}

export function BusinessDirectory() {
  return (
    <Directory type="business" title="Businesses & organizations" image={IMAGES.community}
      intro="Family-friendly childcare, laundromats, markets, clinics and community organizations recommended by neighbors." />
  );
}
