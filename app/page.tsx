import { SeminaryProvider } from "@/lib/store";
import SeminaryApp from "@/components/SeminaryApp";

export default function Page() {
  return (
    <SeminaryProvider>
      <SeminaryApp />
    </SeminaryProvider>
  );
}
