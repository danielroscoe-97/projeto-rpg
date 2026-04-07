import { CampaignLoadingScreen } from "@/components/campaign/CampaignLoadingScreen";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      {children}
      <CampaignLoadingScreen campaignId={id} />
    </>
  );
}
