import { Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SIZE_GUIDE_BOTTOMS, SIZE_GUIDE_TOPS } from "@/lib/catalog";

export function TopsTable() {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="mb-2 text-left font-semibold">
        Shirts, tees, kurtas and jackets (inches)
      </caption>
      <thead>
        <tr className="border-b text-left">
          <th scope="col" className="py-2 pr-4">
            Size
          </th>
          <th scope="col" className="py-2 pr-4">
            Chest
          </th>
          <th scope="col" className="py-2 pr-4">
            Length
          </th>
          <th scope="col" className="py-2">
            Shoulder
          </th>
        </tr>
      </thead>
      <tbody>
        {SIZE_GUIDE_TOPS.map((r) => (
          <tr key={r.size} className="border-b last:border-0">
            <th scope="row" className="py-2 pr-4 text-left">
              {r.size}
            </th>
            <td className="py-2 pr-4">{r.chest}</td>
            <td className="py-2 pr-4">{r.length}</td>
            <td className="py-2">{r.shoulder}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BottomsTable() {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="mb-2 text-left font-semibold">Jeans and trousers (inches)</caption>
      <thead>
        <tr className="border-b text-left">
          <th scope="col" className="py-2 pr-4">
            Waist size
          </th>
          <th scope="col" className="py-2 pr-4">
            Waist
          </th>
          <th scope="col" className="py-2 pr-4">
            Hip
          </th>
          <th scope="col" className="py-2">
            Length
          </th>
        </tr>
      </thead>
      <tbody>
        {SIZE_GUIDE_BOTTOMS.map((r) => (
          <tr key={r.size} className="border-b last:border-0">
            <th scope="row" className="py-2 pr-4 text-left">
              {r.size}
            </th>
            <td className="py-2 pr-4">{r.waist}</td>
            <td className="py-2 pr-4">{r.hip}</td>
            <td className="py-2">{r.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SizeGuideDialog({ bottoms }: { bottoms: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-11 px-0 font-semibold">
          <Ruler className="size-4" aria-hidden="true" /> Size guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Size guide</DialogTitle>
          <DialogDescription>
            Measured flat on the garment. Between sizes? Size up for a relaxed fit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 overflow-x-auto">
          {bottoms ? <BottomsTable /> : <TopsTable />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
