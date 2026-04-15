import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function AdminRouteLayout({ children }) {
  return <div className={geist.className}>{children}</div>;
}
