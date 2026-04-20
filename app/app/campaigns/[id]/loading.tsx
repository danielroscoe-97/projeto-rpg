import { CampaignPageSkeleton } from "@/components/ui/skeletons/CampaignPageSkeleton";

/**
 * B04 perf: Next.js renders this during the page shell's initial await (auth +
 * membership). Keeps the user from seeing a blank white screen between
 * navigation click and first paint.
 */
export default function CampaignLoading() {
  return (
    <div className="space-y-6">
      <CampaignPageSkeleton />
    </div>
  );
}
