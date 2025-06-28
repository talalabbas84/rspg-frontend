// app/page.tsx (or wherever your route is)
import { AppLayout } from "@/components/layouts/AppLayout";
import { SequencesList } from "@/components/sequences/sequences-list";
import { GlobalVariablesList } from "@/components/variables/global-variables-list";
import { GlobalListsList } from "@/components/lists/global-lists-list";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sequences Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">List Of Current Sequences</h2>
          <SequencesList />
        </div>
        {/* Global Variables Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">List Of Global Variables</h2>
          <GlobalVariablesList />
        </div>
        {/* Global Lists Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">List Of Global Lists</h2>
          <GlobalListsList />
        </div>
      </div>
    </AppLayout>
  );
}
