import { createFileRoute } from "@tanstack/react-router";

import { BottomsTable, TopsTable } from "@/components/store/SizeGuide";
import { StaticPage } from "@/components/store/StaticPage";

export const Route = createFileRoute("/_store/size-guide")({
  head: () => ({
    meta: [
      { title: "Size guide | SOL" },
      {
        name: "description",
        content: "Find your S.O.L size: chest, length, shoulder and waist charts.",
      },
    ],
  }),
  component: () => (
    <StaticPage
      title="Size guide"
      intro="Measured flat on the garment, in inches. Between sizes? Size up for a relaxed fit."
    >
      <div className="overflow-x-auto rounded-xl bg-card p-4">
        <TopsTable />
      </div>
      <div className="overflow-x-auto rounded-xl bg-card p-4">
        <BottomsTable />
      </div>
      <h2>How to measure</h2>
      <ul>
        <li>Chest: around the fullest part, under the arms.</li>
        <li>Shoulder: seam to seam across the back.</li>
        <li>Waist: where your jeans usually sit.</li>
      </ul>
    </StaticPage>
  ),
});
