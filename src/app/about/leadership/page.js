import { buildStaticMetadata } from "../../lib/seo";

export const metadata = buildStaticMetadata({
  title: "Leadership | First Medical Associates",
  description:
    "Meet the leadership team guiding First Medical Associates and supporting high-quality care across Maryland.",
  pathname: "/about/leadership",
});

export default function LeadershipStub() {
  return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Leadership implementation coming soon...</div>;
}
